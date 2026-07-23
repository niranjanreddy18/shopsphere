"""Serializers for the wishlist domain."""

from rest_framework import serializers

from apps.products.models import Product
from apps.products.serializers import ProductListSerializer

from .models import WishlistItem


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "created_at"]
        read_only_fields = fields


class AddWishlistItemSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        source="product", queryset=Product.objects.filter(is_active=True)
    )


class MoveToCartSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, default=1)
