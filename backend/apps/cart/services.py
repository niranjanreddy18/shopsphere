"""
Service layer for the cart domain.

Holds three related-but-distinct concerns:
    - CartService: cart/cart-item lifecycle (get-or-create, add, update,
      remove, save-for-later, guest→user merge on login).
    - ShippingService: flat-rate shipping calculation for the cart summary.
    - TaxService: simple percentage-based tax calculation.

Shipping/tax are intentionally simple placeholders — real carrier-rate
shipping and jurisdiction-aware tax tables are out of scope until the
Orders/Checkout module defines what data (destination address, etc.) is
actually available to calculate against. They live here because the cart
summary is the only place that needs them today.
"""

import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction

from apps.products.models import Product
from apps.products.services import InventoryService
from core.exceptions import ApplicationError

from .models import Cart, CartItem

logger = logging.getLogger("apps")

# --- Shipping & tax configuration -----------------------------------------
# Simple, explicit constants rather than a database-backed rules engine —
# appropriate for a single-region MVP; swap for a ShippingRule/TaxRule model
# if/when multi-region support is needed.
FREE_SHIPPING_THRESHOLD = Decimal("100.00")
FLAT_SHIPPING_RATE = Decimal("9.99")
TAX_RATE = Decimal("0.08")  # 8% flat tax rate


class ShippingService:
    """Calculates shipping charges for a cart subtotal."""

    @staticmethod
    def calculate_shipping(subtotal: Decimal) -> Decimal:
        if subtotal <= 0:
            return Decimal("0.00")
        if subtotal >= FREE_SHIPPING_THRESHOLD:
            return Decimal("0.00")
        return FLAT_SHIPPING_RATE


class TaxService:
    """Calculates tax owed on a taxable amount."""

    @staticmethod
    def calculate_tax(taxable_amount: Decimal) -> Decimal:
        if taxable_amount <= 0:
            return Decimal("0.00")
        return (taxable_amount * TAX_RATE).quantize(Decimal("0.01"))


class CartService:
    """Encapsulates all cart/cart-item business logic."""

    @staticmethod
    def get_or_create_cart(*, user=None, cart_token=None) -> tuple[Cart, bool]:
        """
        Resolves the correct cart for the current request:
          - authenticated user  -> their persistent Cart (created if absent)
          - guest with a token  -> that token's Cart (created if the token is unrecognised)
          - guest with no token -> a brand-new guest Cart + freshly generated token

        Returns (cart, is_new_guest_token) — the second value tells the view
        whether it needs to hand a new token back to the client.
        """
        if user is not None and user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=user)
            return cart, False

        if cart_token:
            cart, created = Cart.objects.get_or_create(cart_token=cart_token)
            return cart, False

        new_cart = Cart.objects.create(cart_token=Cart.generate_token())
        return new_cart, True

    @staticmethod
    @transaction.atomic
    def add_item(*, cart: Cart, product: Product, quantity: int = 1) -> CartItem:
        if quantity < 1:
            raise ApplicationError("Quantity must be at least 1.", code="invalid_quantity")

        existing = CartItem.objects.filter(cart=cart, product=product).first()
        target_quantity = quantity + (existing.quantity if existing and not existing.is_saved_for_later else 0)

        InventoryService.check_availability(product=product, requested_quantity=target_quantity)

        if existing:
            existing.quantity = target_quantity
            existing.is_saved_for_later = False
            existing.save(update_fields=["quantity", "is_saved_for_later", "updated_at"])
            return existing

        return CartItem.objects.create(cart=cart, product=product, quantity=quantity)

    @staticmethod
    def update_quantity(*, cart_item: CartItem, quantity: int) -> CartItem:
        if quantity < 1:
            raise ApplicationError("Quantity must be at least 1. Use remove to delete the item.", code="invalid_quantity")

        InventoryService.check_availability(product=cart_item.product, requested_quantity=quantity)
        cart_item.quantity = quantity
        cart_item.save(update_fields=["quantity", "updated_at"])
        return cart_item

    @staticmethod
    def remove_item(*, cart_item: CartItem) -> None:
        cart_item.delete()

    @staticmethod
    def save_for_later(*, cart_item: CartItem) -> CartItem:
        cart_item.is_saved_for_later = True
        cart_item.save(update_fields=["is_saved_for_later", "updated_at"])
        return cart_item

    @staticmethod
    def move_to_cart(*, cart_item: CartItem) -> CartItem:
        """Moves a "saved for later" item back into the active cart, re-checking stock."""
        InventoryService.check_availability(product=cart_item.product, requested_quantity=cart_item.quantity)
        cart_item.is_saved_for_later = False
        cart_item.save(update_fields=["is_saved_for_later", "updated_at"])
        return cart_item

    @staticmethod
    @transaction.atomic
    def merge_guest_cart_into_user_cart(*, guest_cart: Cart, user) -> Cart:
        """
        Called right after a guest logs in (see accounts login flow — the
        frontend sends its X-Cart-Token on the login request and the view
        calls this). Guest items are merged into the user's existing cart,
        summing quantities for any product already present, then the guest
        cart row is deleted.
        """
        user_cart, _ = Cart.objects.get_or_create(user=user)

        for guest_item in guest_cart.items.all():
            existing = CartItem.objects.filter(cart=user_cart, product=guest_item.product).first()
            if existing:
                existing.quantity += guest_item.quantity
                existing.save(update_fields=["quantity", "updated_at"])
            else:
                guest_item.pk = None  # re-insert as a new row bound to user_cart
                guest_item.cart = user_cart
                guest_item.save()

        guest_cart.delete()
        return user_cart

    @staticmethod
    def get_summary(*, cart: Cart, coupon_code: str | None = None) -> dict:
        """
        Computes the full cart summary: subtotal, discount (if a valid
        coupon code is supplied), shipping, tax, and grand total.

        Import of CouponService is deferred to inside the function body to
        avoid a circular import at module load time (apps.coupons.services
        does not import apps.cart, but keeping the import local here keeps
        the two apps' load order irrelevant either way).
        """
        active_items = cart.items.filter(is_saved_for_later=False).select_related("product")
        subtotal = sum((item.line_total for item in active_items), Decimal("0.00"))

        discount = Decimal("0.00")
        coupon_error = None
        if coupon_code:
            from apps.coupons.services import CouponService

            try:
                _, discount = CouponService.validate_coupon(code=coupon_code, subtotal=subtotal, user=cart.user)
            except ApplicationError as exc:
                coupon_error = exc.message

        taxable_amount = subtotal - discount
        shipping = ShippingService.calculate_shipping(taxable_amount)
        tax = TaxService.calculate_tax(taxable_amount)
        total = taxable_amount + shipping + tax

        return {
            "item_count": sum(item.quantity for item in active_items),
            "subtotal": subtotal,
            "discount": discount,
            "coupon_code": coupon_code if discount > 0 else None,
            "coupon_error": coupon_error,
            "shipping": shipping,
            "tax": tax,
            "total": total,
        }
