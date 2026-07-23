"""Django admin registration for the orders app."""

from django.contrib import admin

from .models import Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product", "product_name", "product_sku", "unit_price", "quantity", "line_total"]


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ["status", "note", "changed_by", "created_at"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "status", "total_amount", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["order_number", "user__email"]
    readonly_fields = ["order_number", "subtotal", "discount_amount", "shipping_amount", "tax_amount", "total_amount"]
    inlines = [OrderItemInline, OrderStatusHistoryInline]
