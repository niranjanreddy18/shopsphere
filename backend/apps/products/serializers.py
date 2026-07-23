"""
Serializers for the products domain.

Two-tier read serializers (List vs Detail) are used for Product because the
listing endpoint is high-traffic and should stay light (no full description,
no full image set) while the detail endpoint can afford a richer payload —
avoiding over-fetching on the page that matters most for performance.
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Brand, Category, Inventory, Product, ProductImage, StockMovement


class CategorySerializer(serializers.ModelSerializer):
    """Full category representation, including nested children for building a category tree in the UI."""

    children = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "description", "image", "parent",
            "is_active", "display_order", "children", "product_count", "created_at",
        ]
        read_only_fields = ["id", "slug", "created_at"]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        # Only recurse one level — deep trees should be fetched per-branch
        # rather than serialising the entire tree on every request.
        return CategorySerializer(obj.children.filter(is_active=True), many=True, context=self.context).data

    @extend_schema_field(serializers.IntegerField())
    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "description", "logo", "is_active", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]


class ProductImageSerializer(serializers.ModelSerializer):
    # Exposed as a single resolved URL string regardless of whether the
    # underlying row has an uploaded `image` file or an `external_url` —
    # see ProductImage.resolved_url's docstring. Read-only here: writes
    # still target the underlying `image`/`external_url` fields directly
    # (see ProductImageUploadSerializer used by the admin upload endpoint).
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "is_primary", "display_order"]
        read_only_fields = ["id"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_image(self, obj):
        request = self.context.get("request")
        url = obj.resolved_url
        if not url:
            return None
        return request.build_absolute_uri(url) if request and url.startswith("/") else url


class InventorySerializer(serializers.ModelSerializer):
    available_quantity = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Inventory
        fields = [
            "quantity", "reserved_quantity", "low_stock_threshold",
            "track_inventory", "available_quantity", "is_low_stock",
        ]


class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = ["id", "movement_type", "quantity_change", "quantity_after", "reason", "created_at"]
        read_only_fields = fields


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight representation used for listing/search/filter endpoints."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True, default=None)
    primary_image = serializers.SerializerMethodField()
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    # Populated by the view's queryset annotation (Avg/Count over approved
    # reviews) — see PRODUCT_LIST_QUERYSET in views.py. `average_rating`
    # rounds to one decimal place for display (e.g. "4.3"); `None` when a
    # product has no reviews yet, which the frontend treats as "no rating
    # shown" rather than defaulting to a misleading 0.
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "sku", "price", "discount_price", "effective_price",
            "discount_percentage", "category_name", "brand_name", "primary_image",
            "is_featured", "is_in_stock", "is_low_stock", "sold_count",
            "average_rating", "review_count", "created_at",
        ]

    @extend_schema_field(serializers.FloatField(allow_null=True))
    def get_average_rating(self, obj):
        rating = getattr(obj, "average_rating", None)
        return round(rating, 1) if rating is not None else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_primary_image(self, obj):
        # `images` is expected to be prefetched by the view — iterating the
        # prefetched cache here (rather than `.filter(is_primary=True).first()`)
        # avoids an extra query per row on a list endpoint.
        primary = next((img for img in obj.images.all() if img.is_primary), None)
        image = primary or next(iter(obj.images.all()), None)
        if image is None:
            return None
        url = image.resolved_url
        if not url:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request and url.startswith("/") else url


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full representation for the product detail page."""

    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    inventory = InventorySerializer(read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "short_description", "sku",
            "price", "discount_price", "effective_price", "discount_percentage",
            "category", "brand", "images", "inventory", "is_active", "is_featured",
            "is_in_stock", "sold_count", "view_count", "average_rating", "review_count",
            "weight_kg", "created_at", "updated_at",
        ]

    @extend_schema_field(serializers.FloatField(allow_null=True))
    def get_average_rating(self, obj):
        rating = getattr(obj, "average_rating", None)
        return round(rating, 1) if rating is not None else None


class ProductWriteSerializer(serializers.ModelSerializer):
    """
    Admin-only create/update serializer. Deliberately separate from the read
    serializers: writes accept plain FK ids (`category`, `brand`) rather
    than the nested objects the read serializers return, and expose fields
    (like `is_active`) that a public read response also shows but which
    only an admin should be able to set.
    """

    class Meta:
        model = Product
        fields = [
            "name", "description", "short_description", "category", "brand", "sku",
            "price", "discount_price", "is_active", "is_featured", "weight_kg", "related_products",
        ]

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        discount_price = attrs.get("discount_price", getattr(self.instance, "discount_price", None))
        if discount_price is not None and price is not None and discount_price >= price:
            raise serializers.ValidationError({"discount_price": "Must be lower than the regular price."})
        return attrs
