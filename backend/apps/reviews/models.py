"""Models for the reviews domain."""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import BaseModel


class Review(BaseModel):
    """
    A customer's rating + comment on a product.

    `unique_together(product, user)` — one review per customer per product,
    enforced at the database level so a double-submit can't create
    duplicates. `is_approved` defaults to True (reviews are visible
    immediately) with admin moderation as an exception-handling tool
    (remove spam/abuse) rather than a pre-publication gate — appropriate
    for a low-risk review surface; flip the default if stricter moderation
    is ever needed.
    """

    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.CharField(max_length=1000, blank=True)
    is_approved = models.BooleanField(default=True)

    class Meta:
        db_table = "reviews_review"
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["product", "user"], name="one_review_per_user_per_product")]
        indexes = [models.Index(fields=["product", "is_approved"])]

    def __str__(self) -> str:
        return f"{self.user_id} -> {self.product_id}: {self.rating}\u2605"
