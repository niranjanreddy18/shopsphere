"""Serializers for the cart domain."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.products.models import Product
from apps.products.serializers import ProductListSerializer

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    """Read representation of a cart line item, including a snapshot of the product."""

    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        source="product", queryset=Product.objects.filter(is_active=True), write_only=True
    )
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_id", "quantity", "is_saved_for_later", "line_total", "created_at"]
        read_only_fields = ["id", "created_at"]


class AddCartItemSerializer(serializers.Serializer):
    """Input validation for POST /cart/items/."""

    product_id = serializers.PrimaryKeyRelatedField(
        source="product", queryset=Product.objects.filter(is_active=True)
    )
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    """Input validation for PATCH /cart/items/<id>/."""

    quantity = serializers.IntegerField(min_value=1)


class CartSummarySerializer(serializers.Serializer):
    """Read-only representation of CartService.get_summary()'s return value."""

    item_count = serializers.IntegerField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2)
    coupon_code = serializers.CharField(allow_null=True)
    coupon_error = serializers.CharField(allow_null=True)
    shipping = serializers.DecimalField(max_digits=10, decimal_places=2)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)


class CartSerializer(serializers.ModelSerializer):
    """Full cart representation: active items, saved-for-later items, and the summary."""

    items = serializers.SerializerMethodField()
    saved_for_later = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "cart_token", "items", "saved_for_later", "summary"]

    @extend_schema_field(CartItemSerializer(many=True))
    def get_items(self, obj):
        active = obj.items.filter(is_saved_for_later=False).select_related("product")
        return CartItemSerializer(active, many=True, context=self.context).data

    @extend_schema_field(CartItemSerializer(many=True))
    def get_saved_for_later(self, obj):
        saved = obj.items.filter(is_saved_for_later=True).select_related("product")
        return CartItemSerializer(saved, many=True, context=self.context).data

    @extend_schema_field(CartSummarySerializer)
    def get_summary(self, obj):
        from .services import CartService

        coupon_code = self.context.get("coupon_code")
        return CartSummarySerializer(CartService.get_summary(cart=obj, coupon_code=coupon_code)).data
