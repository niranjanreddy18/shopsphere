"""
Models for the products domain.

Contains the full product catalog schema:
    - Category (self-referential, supports subcategories)
    - Brand
    - Product (core catalog entity)
    - ProductImage (many images per product, one marked primary)
    - Inventory (one-to-one stock record per product)
    - StockMovement (append-only audit log of every stock change)

Design decisions are documented per-model below.
"""

import uuid

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify

from core.models import BaseModel


class Category(BaseModel):
    """
    Product category. Self-referential FK supports a category tree
    (e.g. Electronics -> Laptops -> Gaming Laptops) without a separate
    join table — most catalogs are shallow enough (2-3 levels) that a
    single parent FK is simpler to query than a full nested-set/MPTT
    implementation, at the cost of needing recursion for very deep trees.
    """

    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=170, unique=True, blank=True, db_index=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/%Y/%m/", blank=True, null=True)
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="children"
    )
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "products_category"
        ordering = ["display_order", "name"]
        verbose_name_plural = "Categories"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["parent", "is_active"]),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Brand(BaseModel):
    """Product brand/manufacturer."""

    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=170, unique=True, blank=True, db_index=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="brands/%Y/%m/", blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "products_brand"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(BaseModel):
    """
    Core catalog entity.

    Pricing: `price` is the regular price; `discount_price`, when set and
    lower than `price`, represents an active sale price. Exposing both
    (rather than mutating `price` directly for a sale) preserves the
    "original" price for strike-through display and makes it trivial to end
    a sale by clearing one field.

    `sold_count` is a denormalised counter (rather than always computing
    `SUM(orderitem.quantity)` at read time) so "Best Sellers" sorting is a
    simple indexed column sort. It's intentionally maintained by
    `ProductService.increment_sold_count()` — a hook the future Orders
    module will call on order completion — rather than by a signal, since
    "a sale happened" is a business event that belongs in a service method,
    not something to infer from a generic model save.
    """

    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=280, unique=True, blank=True, db_index=True)
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=500, blank=True)

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")

    sku = models.CharField(max_length=64, unique=True, db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    discount_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal('0'))]
    )

    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)

    # Denormalised counters for cheap, index-backed sorting on hot list
    # endpoints (Best Sellers / popularity) without a JOIN + aggregate on
    # every request.
    sold_count = models.PositiveIntegerField(default=0, db_index=True)
    view_count = models.PositiveIntegerField(default=0)

    # Curated "related products" (e.g. accessories, bundles) in addition to
    # the algorithmic same-category fallback used when this is empty — see
    # ProductService.get_related_products().
    related_products = models.ManyToManyField("self", blank=True, symmetrical=True)

    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "products_product"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["brand", "is_active"]),
            models.Index(fields=["is_featured", "is_active"]),
            models.Index(fields=["-sold_count"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.sku})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            self.slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    @property
    def effective_price(self):
        """The price a customer actually pays: the discount price if one is active, else the regular price."""
        if self.discount_price is not None and self.discount_price < self.price:
            return self.discount_price
        return self.price

    @property
    def discount_percentage(self) -> int:
        """Integer percentage off, for badge display (e.g. "-20%"). Zero when no discount is active."""
        if self.discount_price is None or self.discount_price >= self.price or self.price == 0:
            return 0
        return round((1 - (self.discount_price / self.price)) * 100)

    @property
    def is_in_stock(self) -> bool:
        try:
            return self.inventory.available_quantity > 0
        except Inventory.DoesNotExist:
            return False

    @property
    def is_low_stock(self) -> bool:
        """True when in stock but at/below the low-stock threshold — surfaced to shoppers as urgency messaging."""
        try:
            return self.inventory.is_low_stock
        except Inventory.DoesNotExist:
            return False


class ProductImage(BaseModel):
    """
    A single image belonging to a product. A product has many images;
    exactly one may be flagged `is_primary` (enforced in the service layer,
    mirroring the pattern used for Address.is_default in apps.accounts).

    Supports two image sources, exactly one of which should be set:
      - `image`: an uploaded file, stored under MEDIA_ROOT (the original
        design — used when an admin uploads product photography directly).
      - `external_url`: a CDN/externally-hosted image URL. Added so seed
        data and admin-entered listings can reference real product
        photography without requiring a file upload step — the same
        pattern most production catalogs use once photography lives on a
        CDN/S3 rather than local disk (see the README's Future
        Improvements section on cloud storage). `ProductImageSerializer`
        prefers `image` when both are present, and resolves whichever is
        set into a single `image` field in API responses either way, so
        every consumer (frontend, this serializer's other read paths)
        only ever deals with one resolved URL string regardless of source.
    """

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/%Y/%m/", blank=True, null=True)
    external_url = models.URLField(blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "products_product_image"
        ordering = ["display_order", "created_at"]
        indexes = [models.Index(fields=["product", "is_primary"])]

    def __str__(self) -> str:
        return f"Image for {self.product.name}"

    def clean(self):
        super().clean()
        if not self.image and not self.external_url:
            from django.core.exceptions import ValidationError

            raise ValidationError("Either an uploaded image or an external_url must be provided.")

    @property
    def resolved_url(self) -> str:
        """The one URL to actually display, regardless of which source field is set."""
        if self.image:
            return self.image.url
        return self.external_url


class Inventory(BaseModel):
    """
    One-to-one stock record per product.

    Kept as its own table (rather than plain columns on Product) because
    stock has a distinct lifecycle and access pattern — it's written to far
    more often than the rest of the product record (every add-to-cart
    check, every future order), and separating it avoids invalidating
    product-detail caches on every stock tick once caching is introduced.
    """

    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory")
    quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=10)
    track_inventory = models.BooleanField(
        default=True, help_text="If false, this product is always considered in stock (e.g. made-to-order items)."
    )

    class Meta:
        db_table = "products_inventory"
        verbose_name_plural = "Inventory"

    def __str__(self) -> str:
        return f"Inventory({self.product.sku}): {self.quantity}"

    @property
    def available_quantity(self) -> int:
        """Stock available to sell = on-hand minus whatever's already reserved by open carts/orders."""
        if not self.track_inventory:
            return 1  # sentinel: "always available", never literally read as a count
        return max(self.quantity - self.reserved_quantity, 0)

    @property
    def is_low_stock(self) -> bool:
        return self.track_inventory and 0 < self.available_quantity <= self.low_stock_threshold


class StockMovement(BaseModel):
    """
    Append-only audit log of every stock change.

    Never updated or deleted once written — this is what makes it possible
    to answer "why does this product have 47 units?" after the fact, which
    a mutable `Inventory.quantity` column alone cannot answer.
    """

    class MovementType(models.TextChoices):
        RESTOCK = "RESTOCK", "Restock"
        SALE = "SALE", "Sale"
        RETURN = "RETURN", "Return"
        ADJUSTMENT = "ADJUSTMENT", "Manual Adjustment"
        RESERVATION = "RESERVATION", "Reserved (cart)"
        RELEASE = "RELEASE", "Released (cart expired/removed)"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stock_movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    # Signed delta: positive for stock coming in, negative for stock going out.
    quantity_change = models.IntegerField()
    quantity_after = models.PositiveIntegerField()
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "products_stock_movement"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["product", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.product.sku}: {self.quantity_change:+d} ({self.movement_type})"
