"""Serializers for the orders domain."""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.accounts.serializers import UserSerializer

from .models import Order, OrderItem, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.CharField(source="product.slug", read_only=True, default=None)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "product", "product_slug", "product_image", "product_name",
            "product_sku", "unit_price", "quantity", "line_total",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_product_image(self, obj):
        if obj.product is None:
            return None
        primary = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
        if not primary:
            return None
        url = primary.resolved_url
        if not url:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request and url.startswith("/") else url


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = OrderStatusHistory
        fields = ["id", "status", "note", "changed_by_name", "created_at"]
        read_only_fields = fields


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight representation for order history / admin order lists."""

    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "total_amount", "item_count", "created_at",
        ]
        read_only_fields = fields

    def get_item_count(self, obj) -> int:
        return sum(item.quantity for item in obj.items.all())


class OrderDetailSerializer(serializers.ModelSerializer):
    """Full order representation: line items, status history, addresses, and pricing breakdown."""

    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)
    is_cancellable_by_customer = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "user", "status", "is_cancellable_by_customer",
            "shipping_full_name", "shipping_phone_number", "shipping_line1", "shipping_line2",
            "shipping_city", "shipping_state", "shipping_postal_code", "shipping_country",
            "billing_full_name", "billing_phone_number", "billing_line1", "billing_line2",
            "billing_city", "billing_state", "billing_postal_code", "billing_country",
            "subtotal", "discount_amount", "shipping_amount", "tax_amount", "total_amount",
            "coupon_code", "tracking_number", "carrier", "estimated_delivery_date",
            "cancelled_at", "cancellation_reason", "customer_note",
            "items", "status_history", "created_at", "updated_at",
        ]
        read_only_fields = fields


class CreateOrderSerializer(serializers.Serializer):
    """Validates the checkout request body."""

    shipping_address_id = serializers.UUIDField()
    billing_address_id = serializers.UUIDField()
    coupon_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    customer_note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class CancelOrderSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class SetTrackingInfoSerializer(serializers.Serializer):
    tracking_number = serializers.CharField(max_length=100)
    carrier = serializers.CharField(max_length=100)
    estimated_delivery_date = serializers.DateField(required=False, allow_null=True)
