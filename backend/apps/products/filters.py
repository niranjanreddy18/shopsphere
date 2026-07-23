"""
Filtering for the product listing endpoint.

A dedicated FilterSet (rather than hand-rolling `request.query_params`
parsing in the view) gives us declarative, self-documenting filters that
drf-spectacular can introspect automatically for the Swagger schema.
"""

import django_filters
from django.db.models import F

from .models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category__slug", lookup_expr="exact")
    brand = django_filters.CharFilter(field_name="brand__slug", lookup_expr="exact")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock")

    class Meta:
        model = Product
        fields = ["category", "brand", "min_price", "max_price", "is_featured", "in_stock"]

    def filter_in_stock(self, queryset, name, value):
        """
        `in_stock=true` returns only products with available quantity > 0
        (or that don't track inventory at all); `in_stock=false` returns
        the complement. Implemented against the related Inventory row
        rather than a denormalised flag on Product, since availability
        already changes independently via InventoryService.
        """
        if value:
            return queryset.filter(
                inventory__track_inventory=False
            ) | queryset.filter(inventory__quantity__gt=F("inventory__reserved_quantity"))
        return queryset.filter(
            inventory__track_inventory=True,
            inventory__quantity__lte=F("inventory__reserved_quantity"),
        )
