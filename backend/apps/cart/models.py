"""
Models for the shopping cart domain.

Design decision (guest vs. logged-in carts):
    A cart belongs to EITHER an authenticated `user` OR an anonymous
    `cart_token` (a client-generated UUID sent via the `X-Cart-Token`
    header — see services.py::CartService.get_or_create_cart) — never
    both. This is enforced by a DB CheckConstraint rather than relying on
    application code alone, so a bug elsewhere can't silently create an
    ownerless or double-owned cart.

    A token-based guest cart (instead of Django's session-cookie
    mechanism) was chosen because this is a decoupled SPA talking to the
    API over CORS from a different origin — session cookies bring
    SameSite/credentials complications that a simple bearer-style token
    header avoids entirely, and it's a pattern many production headless
    storefronts use for exactly this reason.
"""

import uuid

from django.core.validators import MinValueValidator
from django.db import models

from apps.products.models import Product
from core.models import BaseModel


class Cart(BaseModel):
    """A shopping cart, owned by either a registered user or an anonymous guest token."""

    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, null=True, blank=True, related_name="cart"
    )
    cart_token = models.UUIDField(null=True, blank=True, unique=True, db_index=True)

    class Meta:
        db_table = "cart_cart"
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(user__isnull=False, cart_token__isnull=True)
                    | models.Q(user__isnull=True, cart_token__isnull=False)
                ),
                name="cart_owned_by_user_xor_token",
            )
        ]

    def __str__(self) -> str:
        owner = self.user.email if self.user_id else f"guest:{self.cart_token}"
        return f"Cart({owner})"

    @staticmethod
    def generate_token() -> uuid.UUID:
        return uuid.uuid4()


class CartItem(BaseModel):
    """
    A single product line within a cart.

    `is_saved_for_later` toggles between "actively in cart" and "saved for
    later" without needing a separate table — both states share the exact
    same shape (cart, product, quantity), and a customer moving an item
    back and forth is just flipping one boolean rather than
    deleting/recreating a row.
    """

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    is_saved_for_later = models.BooleanField(default=False)

    class Meta:
        db_table = "cart_cart_item"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["cart", "product"], name="unique_product_per_cart"),
        ]
        indexes = [
            models.Index(fields=["cart", "is_saved_for_later"]),
        ]

    def __str__(self) -> str:
        return f"{self.quantity} x {self.product.name}"

    @property
    def line_total(self):
        return self.product.effective_price * self.quantity
