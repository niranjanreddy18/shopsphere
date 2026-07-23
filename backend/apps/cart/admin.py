"""Django admin registration for the cart app."""

from django.contrib import admin

from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "cart_token", "created_at"]
    search_fields = ["user__email", "cart_token"]
    inlines = [CartItemInline]
