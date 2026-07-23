"""
Models for the wishlist domain.

Unlike the cart, the wishlist is authenticated-users-only — there's no
guest wishlist requirement in this module's scope, so a single flat
`WishlistItem(user, product)` table is sufficient; no wrapping `Wishlist`
container model is needed since a user has exactly one implicit wishlist
(all their WishlistItem rows).
"""

from django.db import models

from apps.products.models import Product
from core.models import BaseModel


class WishlistItem(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="wishlist_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlisted_by")

    class Meta:
        db_table = "wishlist_item"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "product"], name="unique_wishlist_item_per_user"),
        ]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.user.email} ♥ {self.product.name}"
