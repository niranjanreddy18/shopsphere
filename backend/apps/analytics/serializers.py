"""
Serializers for the analytics domain.

These are read-only, output-only serializers (there's no "analytics"
model to validate input against) — they exist purely to give
drf-spectacular a concrete response shape for Swagger, and to guarantee a
consistent field set/typing for the frontend charts to consume.
"""

from rest_framework import serializers

from apps.orders.serializers import OrderListSerializer


class DashboardStatsSerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_orders = serializers.IntegerField()
    orders_this_month = serializers.IntegerField()
    pending_orders_count = serializers.IntegerField()
    total_customers = serializers.IntegerField()
    new_customers_this_month = serializers.IntegerField()
    total_products = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()


class RevenueAnalyticsPointSerializer(serializers.Serializer):
    month = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    order_count = serializers.IntegerField()


class OrderTrendPointSerializer(serializers.Serializer):
    date = serializers.CharField()
    order_count = serializers.IntegerField()
    cancelled_count = serializers.IntegerField()


class TopProductSerializer(serializers.Serializer):
    product_id = serializers.UUIDField(allow_null=True)
    product_name = serializers.CharField()
    product_sku = serializers.CharField()
    units_sold = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)


class RecentOrdersResponseSerializer(serializers.Serializer):
    """Documents that /analytics/recent-orders/ returns a plain list of OrderListSerializer items."""

    results = OrderListSerializer(many=True)
