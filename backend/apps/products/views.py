"""
API views for the products domain.

Views stay thin: queryset assembly + filtering wiring + calling services.py
for anything that mutates state (stock adjustments, image ordering, etc).
"""

from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import filters, generics, permissions, serializers as drf_serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import ProductFilter
from .models import Brand, Category, Inventory, Product, ProductImage, StockMovement
from .permissions import IsAdminOrReadOnly
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    InventorySerializer,
    ProductDetailSerializer,
    ProductImageSerializer,
    ProductListSerializer,
    ProductWriteSerializer,
    StockMovementSerializer,
)
from .services import InventoryService, ProductService

# Base queryset shared by every product-listing-style view: only active
# products, with the FKs/reverse-relations the list serializer needs
# pre-fetched so pagination doesn't trigger N+1 queries per page.
#
# `average_rating`/`review_count` are annotated here (one aggregate query
# per page, computed by the database) rather than each ProductCard making
# a separate "get this product's reviews" request — the classic N+1 that
# would otherwise cost one extra round-trip per card on every listing page.
# Only `is_approved` reviews count, matching what ProductReviewListView
# already shows publicly (see apps.reviews.views).
PRODUCT_LIST_QUERYSET = (
    Product.objects.filter(is_active=True)
    .select_related("category", "brand")
    .prefetch_related("images")
    .annotate(
        average_rating=Avg("reviews__rating", filter=Q(reviews__is_approved=True)),
        review_count=Count("reviews", filter=Q(reviews__is_approved=True)),
    )
    # Explicit ordering: combining `.annotate()` (which introduces an
    # implicit GROUP BY for the Avg/Count aggregates) with a model's
    # `Meta.ordering` default is exactly the situation Django's own
    # UnorderedObjectListWarning warns about — pagination needs a stable
    # order to return consistent pages, so this is spelled out explicitly
    # here rather than left to Product.Meta.ordering to (maybe) carry
    # through the aggregation.
    .order_by("-created_at")
)


class CategoryListCreateView(generics.ListCreateAPIView):
    """GET (public): list active categories. POST (admin): create a category."""

    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        # Top-level only in the list view — children are nested by the
        # serializer. Admins listing for a management UI can still see
        # inactive categories.
        qs = Category.objects.filter(parent__isnull=True)
        if not (self.request.user.is_authenticated and self.request.user.is_admin):
            qs = qs.filter(is_active=True)
        return qs


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE a single category by slug."""

    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = Category.objects.all()
    lookup_field = "slug"


class BrandListCreateView(generics.ListCreateAPIView):
    serializer_class = BrandSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = Brand.objects.all()
        if not (self.request.user.is_authenticated and self.request.user.is_admin):
            qs = qs.filter(is_active=True)
        return qs


class BrandDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BrandSerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = Brand.objects.all()
    lookup_field = "slug"


class ProductListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/products/           — search, filter, sort, paginate the catalog
    POST /api/v1/products/           — create a product (admin only)

    Query params:
        search      free-text search across name/description/sku/category/brand
        category    category slug
        brand       brand slug
        min_price / max_price
        is_featured true|false
        in_stock    true|false
        ordering    price | -price | created_at | -created_at | sold_count | -sold_count | name | -name
    """

    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["name", "description", "short_description", "sku", "category__name", "brand__name"]
    ordering_fields = ["price", "created_at", "sold_count", "name"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        return ProductWriteSerializer if self.request.method == "POST" else ProductListSerializer

    def get_queryset(self):
        # Overriding `filter_backends` on this view (to add Search/Ordering
        # alongside the globally-configured DjangoFilterBackend) replaces
        # the default list entirely, so DjangoFilterBackend must be
        # re-listed explicitly above or `filterset_class` would silently
        # never be applied.
        qs = PRODUCT_LIST_QUERYSET
        if self.request.user.is_authenticated and self.request.user.is_admin:
            qs = Product.objects.all().select_related("category", "brand").prefetch_related("images")
        return qs

    @extend_schema(parameters=[OpenApiParameter(name="search", type=str, description="Free-text search query")])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save()
        # Every new product needs an Inventory row; ProductWriteSerializer
        # doesn't create one, so we do it via the service immediately after.
        Inventory.objects.get_or_create(product=serializer.instance)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET (public, increments view count) / PATCH / DELETE (admin) a single product by slug."""

    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"

    def get_queryset(self):
        qs = (
            Product.objects.all()
            .select_related("category", "brand", "inventory")
            .prefetch_related("images")
            .annotate(
                average_rating=Avg("reviews__rating", filter=Q(reviews__is_approved=True)),
                review_count=Count("reviews", filter=Q(reviews__is_approved=True)),
            )
        )
        if self.request.method in permissions.SAFE_METHODS and not (
            self.request.user.is_authenticated and self.request.user.is_admin
        ):
            qs = qs.filter(is_active=True)
        return qs

    def get_serializer_class(self):
        return ProductWriteSerializer if self.request.method in ("PATCH", "PUT") else ProductDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        ProductService.increment_view_count(product=instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class RelatedProductsView(APIView):
    """GET /api/v1/products/<slug>/related/ — curated or same-category related products."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=ProductListSerializer(many=True))
    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug, is_active=True)
        related = ProductService.get_related_products(product=product)
        serializer = ProductListSerializer(related, many=True, context={"request": request})
        return Response(serializer.data)


class FeaturedProductsView(generics.ListAPIView):
    """GET /api/v1/products/featured/"""

    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    queryset = PRODUCT_LIST_QUERYSET.filter(is_featured=True)

    # Cache safety: this queryset is a fixed class attribute with no
    # per-user branching (AllowAny, never varies by admin/customer/guest),
    # so caching the whole response for every visitor is unambiguously
    # correct — see the README's Caching Strategy section for the
    # TTL-expiry-over-signal-invalidation trade-off this implies (a newly
    # featured product can take up to CACHE_TTL to appear here).
    @method_decorator(cache_page(60 * 10))
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class NewArrivalsView(generics.ListAPIView):
    """GET /api/v1/products/new-arrivals/ — most recently created active products."""

    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    queryset = PRODUCT_LIST_QUERYSET.order_by("-created_at")

    @method_decorator(cache_page(60 * 10))
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class BestSellersView(generics.ListAPIView):
    """GET /api/v1/products/best-sellers/ — ranked by denormalised sold_count."""

    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    queryset = PRODUCT_LIST_QUERYSET.order_by("-sold_count")

    @method_decorator(cache_page(60 * 10))
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ProductImageListCreateView(generics.ListCreateAPIView):
    """GET/POST images for a specific product (admin write, public read)."""

    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_product(self):
        return get_object_or_404(Product, slug=self.kwargs["slug"])

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProductImage.objects.none()
        return ProductImage.objects.filter(product=self.get_product())

    def perform_create(self, serializer):
        serializer.save(product=self.get_product())


class ProductImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE a single product image (admin only)."""

    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = ProductImage.objects.all()


class SetPrimaryImageView(APIView):
    """POST /api/v1/products/images/<uuid:pk>/set-primary/ (admin only)."""

    permission_classes = [IsAdminOrReadOnly]

    @extend_schema(request=None, responses=ProductImageSerializer)
    def post(self, request, pk):
        image = get_object_or_404(ProductImage, pk=pk)
        updated = ProductService.set_primary_image(image=image)
        return Response(ProductImageSerializer(updated).data)


class InventoryAdjustView(APIView):
    """
    POST /api/v1/products/<slug>/inventory/adjust/  (admin only)

    Body: { "quantity_change": 50, "movement_type": "RESTOCK", "reason": "New shipment" }
    """

    permission_classes = [IsAdminOrReadOnly]

    @extend_schema(
        request=inline_serializer(
            "InventoryAdjustRequest",
            {
                "quantity_change": drf_serializers.IntegerField(),
                "movement_type": drf_serializers.ChoiceField(choices=StockMovement.MovementType.choices, required=False),
                "reason": drf_serializers.CharField(required=False),
            },
        ),
        responses=InventorySerializer,
    )
    def post(self, request, slug):
        product = get_object_or_404(Product, slug=slug)
        quantity_change = request.data.get("quantity_change")
        movement_type = request.data.get("movement_type", StockMovement.MovementType.ADJUSTMENT)
        reason = request.data.get("reason", "")

        if quantity_change is None:
            return Response(
                {"success": False, "message": "quantity_change is required.", "errors": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inventory = InventoryService.adjust_stock(
            product=product, quantity_change=int(quantity_change), movement_type=movement_type, reason=reason
        )
        return Response(InventorySerializer(inventory).data, status=status.HTTP_200_OK)


class StockMovementListView(generics.ListAPIView):
    """GET /api/v1/products/<slug>/inventory/movements/ (admin only) — audit trail."""

    serializer_class = StockMovementSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return StockMovement.objects.none()
        return StockMovement.objects.filter(product__slug=self.kwargs["slug"])
