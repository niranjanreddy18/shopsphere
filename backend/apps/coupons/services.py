"""Service layer for the coupons domain."""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from core.exceptions import ApplicationError

from .models import Coupon, CouponUsage


class CouponService:
    """Validates coupon codes and calculates discount amounts."""

    @staticmethod
    def validate_coupon(*, code: str, subtotal: Decimal, user=None) -> tuple[Coupon, Decimal]:
        """
        Validates a coupon code against the current cart subtotal and
        (if provided) the requesting user's redemption history. Returns
        (coupon, discount_amount) on success; raises ApplicationError with a
        human-readable message otherwise.
        """
        try:
            coupon = Coupon.objects.get(code=code.upper().strip())
        except Coupon.DoesNotExist as exc:
            raise ApplicationError("Invalid coupon code.", code="invalid_coupon") from exc

        if not coupon.is_active:
            raise ApplicationError("This coupon is no longer active.", code="coupon_inactive")

        now = timezone.now()
        if now < coupon.valid_from:
            raise ApplicationError("This coupon is not active yet.", code="coupon_not_started")
        if now > coupon.valid_until:
            raise ApplicationError("This coupon has expired.", code="coupon_expired")

        if subtotal < coupon.min_order_amount:
            raise ApplicationError(
                f"This coupon requires a minimum order of {coupon.min_order_amount}.",
                code="minimum_not_met",
            )

        if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
            raise ApplicationError("This coupon has reached its usage limit.", code="usage_limit_reached")

        if user is not None and getattr(user, "is_authenticated", False):
            user_uses = CouponUsage.objects.filter(coupon=coupon, user=user).count()
            if user_uses >= coupon.usage_limit_per_user:
                raise ApplicationError("You've already used this coupon the maximum number of times.", code="user_limit_reached")

        discount_amount = CouponService.calculate_discount(coupon=coupon, subtotal=subtotal)
        return coupon, discount_amount

    @staticmethod
    def calculate_discount(*, coupon: Coupon, subtotal: Decimal) -> Decimal:
        """Pure calculation, isolated from validation so it's independently testable/reusable."""
        if coupon.discount_type == Coupon.DiscountType.FIXED:
            discount = coupon.discount_value
        else:
            discount = (subtotal * coupon.discount_value / Decimal("100")).quantize(Decimal("0.01"))
            if coupon.max_discount_amount is not None:
                discount = min(discount, coupon.max_discount_amount)

        # A discount can never exceed the subtotal itself (no negative totals).
        return min(discount, subtotal)

    @staticmethod
    @transaction.atomic
    def record_usage(*, coupon: Coupon, user, discount_amount: Decimal) -> CouponUsage:
        """
        Records a redemption and increments the coupon's usage counter.
        Not called from any endpoint yet — this is the hook the future
        Orders/Checkout module will call once an order is successfully
        placed with a coupon applied.
        """
        usage = CouponUsage.objects.create(coupon=coupon, user=user, discount_amount=discount_amount)
        Coupon.objects.filter(pk=coupon.pk).update(times_used=coupon.times_used + 1)
        return usage
