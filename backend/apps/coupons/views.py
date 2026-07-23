"""API views for the coupons domain."""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from .models import Coupon
from .permissions import IsAdminOrReadOnlyForActiveCoupons
from .serializers import CouponSerializer, CouponValidationResultSerializer, ValidateCouponSerializer
from .services import CouponService


class CouponListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/coupons/ (admin only) — manage the coupon catalog."""

    serializer_class = CouponSerializer
    permission_classes = [IsAdminOrReadOnlyForActiveCoupons]
    queryset = Coupon.objects.all()


class CouponDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/coupons/<uuid:pk>/ (admin only)."""

    serializer_class = CouponSerializer
    permission_classes = [IsAdminOrReadOnlyForActiveCoupons]
    queryset = Coupon.objects.all()


class ValidateCouponView(APIView):
    """
    POST /api/v1/coupons/validate/  (any user, including guests)

    Body: { "code": "SAVE10", "subtotal": "120.00" }
    Used by the cart page to preview a discount before it's actually
    applied via the cart summary's `coupon_code` query param.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(request=ValidateCouponSerializer, responses=CouponValidationResultSerializer)
    def post(self, request):
        serializer = ValidateCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        coupon, discount_amount = CouponService.validate_coupon(
            code=serializer.validated_data["code"],
            subtotal=serializer.validated_data["subtotal"],
            user=request.user if request.user.is_authenticated else None,
        )

        return Response(
            {
                "valid": True,
                "code": coupon.code,
                "discount_amount": discount_amount,
                "discount_type": coupon.discount_type,
            },
            status=status.HTTP_200_OK,
        )
