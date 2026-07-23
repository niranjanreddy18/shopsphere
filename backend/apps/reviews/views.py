"""API views for the reviews domain."""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.models import Product
from core.permissions import IsAdmin

from .models import Review
from .permissions import IsReviewOwnerOrAdmin
from .serializers import CreateReviewSerializer, ReviewSerializer, SetReviewApprovalSerializer
from .services import ReviewService


class ProductReviewListView(generics.ListAPIView):
    """GET /api/v1/reviews/product/<uuid:product_id>/ — approved reviews for a product (public)."""

    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Review.objects.none()
        return Review.objects.filter(product_id=self.kwargs["product_id"], is_approved=True).select_related("user")


class CreateReviewView(APIView):
    """POST /api/v1/reviews/ — leave a review (one per product per customer)."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=CreateReviewSerializer, responses={201: ReviewSerializer})
    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = get_object_or_404(Product, pk=serializer.validated_data["product_id"])

        review = ReviewService.create_review(
            user=request.user, product=product,
            rating=serializer.validated_data["rating"], comment=serializer.validated_data.get("comment", ""),
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ReviewDeleteView(generics.DestroyAPIView):
    """DELETE /api/v1/reviews/<uuid:pk>/ — the review's own author, or an admin."""

    serializer_class = ReviewSerializer
    queryset = Review.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsReviewOwnerOrAdmin]


# --- Admin: review moderation ------------------------------------------------


class AdminReviewListView(generics.ListAPIView):
    """GET /api/v1/reviews/admin/ — every review, including unapproved ones (admin only)."""

    serializer_class = ReviewSerializer
    permission_classes = [IsAdmin]
    queryset = Review.objects.select_related("user", "product").all()
    filterset_fields = ["is_approved", "product"]


class AdminReviewApprovalView(APIView):
    """PATCH /api/v1/reviews/admin/<uuid:pk>/approval/ — approve or hide a review (admin only)."""

    permission_classes = [IsAdmin]

    @extend_schema(request=SetReviewApprovalSerializer, responses=ReviewSerializer)
    def patch(self, request, pk):
        review = get_object_or_404(Review, pk=pk)
        serializer = SetReviewApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = ReviewService.set_approval(review=review, is_approved=serializer.validated_data["is_approved"])
        return Response(ReviewSerializer(review).data)


class TestimonialReviewListView(generics.ListAPIView):
    """
    GET /api/v1/reviews/testimonials/ — a small, curated slice of the
    platform's best reviews (public), for the home page's "Customer
    Reviews" section.

    Deliberately narrow: 4-5-star, approved, with a non-empty comment
    (a bare star rating with no text makes an unconvincing testimonial
    card) — this is presentation curation, not a general review listing,
    which is why it's a separate view from ProductReviewListView rather
    than that view with extra query params.
    """

    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # always a small, fixed-size showcase, not a paginated feed

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Review.objects.none()
        return (
            Review.objects.filter(is_approved=True, rating__gte=4)
            .exclude(comment="")
            .select_related("user", "product")
            .order_by("-rating", "-created_at")[:8]
        )
