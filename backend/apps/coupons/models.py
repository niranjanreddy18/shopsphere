"""
Models for the coupons domain.

Coupon: the discount rule itself (percentage or fixed-amount off, with
optional min-order/max-discount/usage limits and a validity window).

CouponUsage: an append-only record of "this user redeemed this coupon at
this time", used to enforce `usage_limit_per_user` and to keep a permanent
audit trail. Redemption (creating a CouponUsage row) will be triggered by
the future Orders module at checkout completion — see
CouponService.record_usage(), which exists and is tested but is not yet
wired to any endpoint in this prompt's scope.
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from core.models import BaseModel


class Coupon(BaseModel):
    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", "Percentage"
        FIXED = "FIXED", "Fixed Amount"

    code = models.CharField(max_length=32, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True)

    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    # Only meaningful for PERCENTAGE coupons — caps the discount in currency
    # terms so "50% off" can't blow out on a very large order.
    max_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))]
    )
    min_order_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0"), validators=[MinValueValidator(Decimal("0"))]
    )

    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()

    usage_limit = models.PositiveIntegerField(null=True, blank=True, help_text="Total redemptions allowed across all users. Blank = unlimited.")
    usage_limit_per_user = models.PositiveIntegerField(default=1)
    times_used = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "coupons_coupon"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["code", "is_active"])]

    def __str__(self) -> str:
        return self.code

    def save(self, *args, **kwargs):
        self.code = self.code.upper().strip()
        super().save(*args, **kwargs)


class CouponUsage(BaseModel):
    """One row per successful redemption of a coupon by a user."""

    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="usages")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="coupon_usages")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "coupons_coupon_usage"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["coupon", "user"])]

    def __str__(self) -> str:
        return f"{self.user.email} used {self.coupon.code}"
