"""
Service layer for the products domain.

Views only parse input, call these services, and shape the response — see
apps/accounts/services.py for the rationale behind this pattern, applied
consistently here.
"""

import logging

from django.db import transaction
from django.db.models import F, Q

from core.exceptions import ApplicationError

from .models import Inventory, Product, ProductImage, StockMovement

logger = logging.getLogger("apps")


class InventoryService:
    """
    Encapsulates all stock-mutating logic. Every change to `Inventory.quantity`
    or `reserved_quantity` MUST go through this service so a matching
    `StockMovement` audit row is always written — never mutate those fields
    directly elsewhere in the codebase.
    """

    @staticmethod
    @transaction.atomic
    def adjust_stock(*, product: Product, quantity_change: int, movement_type: str, reason: str = "") -> Inventory:
        """
        Apply a signed quantity change to a product's on-hand stock and
        record the movement. `select_for_update` locks the Inventory row for
        the duration of the transaction so concurrent adjustments (e.g. two
        simultaneous restocks) can't race and silently drop one.
        """
        inventory = Inventory.objects.select_for_update().get(product=product)

        new_quantity = inventory.quantity + quantity_change
        if new_quantity < 0:
            raise ApplicationError(
                f"Cannot reduce stock below zero (current: {inventory.quantity}, change: {quantity_change}).",
                code="insufficient_stock",
            )

        inventory.quantity = new_quantity
        inventory.save(update_fields=["quantity", "updated_at"])

        StockMovement.objects.create(
            product=product,
            movement_type=movement_type,
            quantity_change=quantity_change,
            quantity_after=new_quantity,
            reason=reason,
        )
        return inventory

    @staticmethod
    def check_availability(*, product: Product, requested_quantity: int) -> None:
        """Raises ApplicationError if the requested quantity cannot currently be fulfilled."""
        try:
            inventory = product.inventory
        except Inventory.DoesNotExist as exc:
            raise ApplicationError("This product has no inventory record.", code="no_inventory") from exc

        if not inventory.track_inventory:
            return

        if requested_quantity > inventory.available_quantity:
            raise ApplicationError(
                f"Only {inventory.available_quantity} unit(s) of '{product.name}' available.",
                code="insufficient_stock",
            )

    @staticmethod
    @transaction.atomic
    def reserve_stock(*, product: Product, quantity: int) -> None:
        """
        Increments `reserved_quantity` when an item is added to a cart, so
        the same units can't be oversold to two simultaneous shoppers.
        Reservations are released via `release_stock` (item removed from
        cart) or converted into a real deduction once Orders is built.
        """
        InventoryService.check_availability(product=product, requested_quantity=quantity)
        inventory = Inventory.objects.select_for_update().get(product=product)
        inventory.reserved_quantity = F("reserved_quantity") + quantity
        inventory.save(update_fields=["reserved_quantity", "updated_at"])

    @staticmethod
    @transaction.atomic
    def release_stock(*, product: Product, quantity: int) -> None:
        """Releases a previous reservation (cart item removed/quantity reduced)."""
        inventory = Inventory.objects.select_for_update().get(product=product)
        inventory.reserved_quantity = F("reserved_quantity") - quantity
        inventory.save(update_fields=["reserved_quantity", "updated_at"])
        inventory.refresh_from_db()
        if inventory.reserved_quantity < 0:
            # Defensive clamp: should be unreachable if callers are
            # disciplined about matching reserve/release calls, but a
            # negative reservation is a silent-corruption risk worth
            # guarding against explicitly.
            inventory.reserved_quantity = 0
            inventory.save(update_fields=["reserved_quantity", "updated_at"])


class ProductService:
    """Business logic for product CRUD, related products, and popularity counters."""

    @staticmethod
    @transaction.atomic
    def create_product(*, images=None, initial_stock: int = 0, **product_fields) -> Product:
        """
        Creates a Product plus its Inventory row (every product must have
        one) in a single transaction, and optionally attaches uploaded
        images.
        """
        product = Product(**product_fields)
        product.full_clean(exclude=["slug"])  # slug is auto-generated in save()
        product.save()

        Inventory.objects.create(product=product, quantity=initial_stock)

        if initial_stock > 0:
            StockMovement.objects.create(
                product=product,
                movement_type=StockMovement.MovementType.RESTOCK,
                quantity_change=initial_stock,
                quantity_after=initial_stock,
                reason="Initial stock on product creation.",
            )

        for index, image_file in enumerate(images or []):
            ProductImage.objects.create(
                product=product, image=image_file, is_primary=(index == 0), display_order=index
            )

        return product

    @staticmethod
    def increment_view_count(*, product: Product) -> None:
        """Fire-and-forget counter used by the product-detail endpoint."""
        Product.objects.filter(pk=product.pk).update(view_count=F("view_count") + 1)

    @staticmethod
    def increment_sold_count(*, product: Product, quantity: int) -> None:
        """
        Called by the future Orders module when an order is placed/confirmed.
        Not wired to any endpoint yet, but ready for that integration —
        see the products README section in the top-level README.
        """
        Product.objects.filter(pk=product.pk).update(sold_count=F("sold_count") + quantity)

    @staticmethod
    def get_related_products(*, product: Product, limit: int = 8):
        """
        Curated `related_products` take priority; if a product has none
        curated, fall back to other active products in the same category,
        excluding itself.
        """
        from django.db.models import Avg, Count, Q

        rating_annotations = dict(
            average_rating=Avg("reviews__rating", filter=Q(reviews__is_approved=True)),
            review_count=Count("reviews", filter=Q(reviews__is_approved=True)),
        )

        curated = product.related_products.filter(is_active=True).annotate(**rating_annotations)[:limit]
        if curated:
            return curated

        return (
            Product.objects.filter(category=product.category, is_active=True)
            .exclude(pk=product.pk)
            .select_related("category", "brand")
            .prefetch_related("images")
            .annotate(**rating_annotations)[:limit]
        )

    @staticmethod
    def set_primary_image(*, image: ProductImage) -> ProductImage:
        """Marks one image as primary, unsetting the flag on every sibling image."""
        ProductImage.objects.filter(product=image.product).exclude(pk=image.pk).update(is_primary=False)
        image.is_primary = True
        image.save(update_fields=["is_primary"])
        return image

    @staticmethod
    def search_products(*, query: str, queryset=None):
        """
        Simple, portable (works on SQLite in tests and PostgreSQL in
        production) keyword search across name/description/SKU/category/
        brand. A production system at larger scale would likely swap this
        for PostgreSQL full-text search (`SearchVector`/`SearchRank`) or an
        external index (Elasticsearch/OpenSearch); this is intentionally
        the simplest thing that works correctly everywhere first.
        """
        base_qs = Product.objects.filter(is_active=True) if queryset is None else queryset
        if not query:
            return base_qs

        return base_qs.filter(
            Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(short_description__icontains=query)
            | Q(sku__icontains=query)
            | Q(category__name__icontains=query)
            | Q(brand__name__icontains=query)
        ).distinct()
