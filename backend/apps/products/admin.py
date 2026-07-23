"""Django admin registration for the products app."""

from django.contrib import admin

from .models import Brand, Category, Inventory, Product, ProductImage, StockMovement


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class InventoryInline(admin.StackedInline):
    model = Inventory
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "parent", "is_active", "display_order"]
    list_filter = ["is_active"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "category", "brand", "price", "discount_price", "is_active", "is_featured", "sold_count"]
    list_filter = ["is_active", "is_featured", "category", "brand"]
    search_fields = ["name", "sku"]
    inlines = [ProductImageInline, InventoryInline]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["product", "movement_type", "quantity_change", "quantity_after", "created_at"]
    list_filter = ["movement_type"]
    search_fields = ["product__name", "product__sku"]
    readonly_fields = ["product", "movement_type", "quantity_change", "quantity_after", "reason"]
