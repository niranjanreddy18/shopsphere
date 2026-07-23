"""Serializers for the coupons domain."""

from decimal import Decimal

from rest_framework import serializers

from .models import Coupon
from .validators import validate_valid_date_range


class CouponSerializer(serializers.ModelSerializer):
    """Full admin-facing representation, used for both list/detail and create/update."""

    class Meta:
        model = Coupon
        fields = [
            "id", "code", "description", "discount_type", "discount_value",
            "max_discount_amount", "min_order_amount", "valid_from", "valid_until",
            "usage_limit", "usage_limit_per_user", "times_used", "is_active", "created_at",
        ]
        read_only_fields = ["id", "times_used", "created_at"]

    def validate(self, attrs):
        valid_from = attrs.get("valid_from", getattr(self.instance, "valid_from", None))
        valid_until = attrs.get("valid_until", getattr(self.instance, "valid_until", None))
        try:
            validate_valid_date_range(valid_from, valid_until)
        except Exception as exc:
            raise serializers.ValidationError({"valid_until": str(exc)}) from exc
        return attrs


class ValidateCouponSerializer(serializers.Serializer):
    """Input for POST /coupons/validate/."""

    code = serializers.CharField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"))


class CouponValidationResultSerializer(serializers.Serializer):
    """Output for POST /coupons/validate/."""

    valid = serializers.BooleanField()
    code = serializers.CharField()
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_type = serializers.CharField()
