"""API views for the wishlist domain. Every endpoint here requires authentication."""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WishlistItem
from .serializers import AddWishlistItemSerializer, MoveToCartSerializer, WishlistItemSerializer
from .services import WishlistService


class WishlistListCreateView(generics.ListCreateAPIView):
    """GET: list the caller's wishlist. POST: add a product to it."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return WishlistItem.objects.none()
        return WishlistItem.objects.filter(user=self.request.user).select_related("product")

    def get_serializer_class(self):
        return AddWishlistItemSerializer if self.request.method == "POST" else WishlistItemSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = WishlistService.add_item(user=request.user, product=serializer.validated_data["product"])
        return Response(WishlistItemSerializer(item).data, status=status.HTTP_201_CREATED)


class WishlistItemDetailView(APIView):
    """DELETE /api/v1/wishlist/<uuid:product_id>/ — remove a product from the wishlist."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={204: OpenApiResponse(description="Removed from wishlist.")})
    def delete(self, request, product_id):
        WishlistService.remove_item(user=request.user, product_id=product_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MoveToCartView(APIView):
    """POST /api/v1/wishlist/<uuid:product_id>/move-to-cart/"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=MoveToCartSerializer,
        responses=OpenApiResponse(description="Moved to cart."),
    )
    def post(self, request, product_id):
        serializer = MoveToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        WishlistService.move_to_cart(
            user=request.user, product_id=product_id, quantity=serializer.validated_data["quantity"]
        )
        return Response({"success": True, "message": "Moved to cart."}, status=status.HTTP_200_OK)
