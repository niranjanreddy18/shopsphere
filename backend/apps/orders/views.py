"""
API views for the orders domain.

Views stay thin: parse/validate input via serializers, delegate to
OrderService/InvoiceService, and shape the HTTP response.
"""

import django_filters
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import ApplicationError
from core.permissions import IsAdmin

from .models import Order
from .permissions import IsOrderOwnerOrAdmin
from .serializers import (
    CancelOrderSerializer,
    CreateOrderSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    SetTrackingInfoSerializer,
    UpdateOrderStatusSerializer,
)
from .services import InvoiceService, OrderService


class OrderFilter(django_filters.FilterSet):
    """Admin order-list filters: status and a date range on placement time."""

    status = django_filters.ChoiceFilter(choices=Order.Status.choices)
    date_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Order
        fields = ["status"]


class CheckoutView(APIView):
    """
    POST /api/v1/orders/checkout/

    Places an order from the caller's current cart. See
    OrderService.create_order_from_cart for the full checkout flow
    (address snapshotting, stock validation/deduction, coupon redemption,
    cart clearing — all in one atomic transaction).
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=CreateOrderSerializer, responses={201: OrderDetailSerializer})
    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = OrderService.create_order_from_cart(
            user=request.user,
            shipping_address_id=serializer.validated_data["shipping_address_id"],
            billing_address_id=serializer.validated_data["billing_address_id"],
            coupon_code=serializer.validated_data.get("coupon_code") or None,
            customer_note=serializer.validated_data.get("customer_note", ""),
        )

        return Response(
            OrderDetailSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED
        )


class OrderHistoryView(generics.ListAPIView):
    """GET /api/v1/orders/ — the caller's own order history, newest first."""

    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_fields = ["status"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Order.objects.none()
        return Order.objects.filter(user=self.request.user).prefetch_related("items")


class OrderDetailView(generics.RetrieveAPIView):
    """GET /api/v1/orders/<uuid:pk>/ — full order detail (owner or admin)."""

    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrderOwnerOrAdmin]
    queryset = Order.objects.prefetch_related("items", "status_history").select_related("user")


class OrderTrackingView(generics.RetrieveAPIView):
    """GET /api/v1/orders/<uuid:pk>/tracking/ — status timeline + carrier info."""

    serializer_class = OrderDetailSerializer  # includes status_history + tracking fields already
    permission_classes = [permissions.IsAuthenticated, IsOrderOwnerOrAdmin]
    queryset = Order.objects.prefetch_related("status_history")


class CancelOrderView(APIView):
    """POST /api/v1/orders/<uuid:pk>/cancel/ — customer or admin cancellation."""

    permission_classes = [permissions.IsAuthenticated, IsOrderOwnerOrAdmin]

    @extend_schema(request=CancelOrderSerializer, responses={200: OrderDetailSerializer})
    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        self.check_object_permissions(request, order)

        if request.user.role != request.user.Role.ADMIN and not order.is_cancellable_by_customer:
            raise ApplicationError(
                f"Orders in '{order.status}' status can no longer be cancelled by the customer.",
                code="not_cancellable",
            )

        serializer = CancelOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = OrderService.cancel_order(
            order=order, cancelled_by=request.user, reason=serializer.validated_data.get("reason", "")
        )
        return Response(OrderDetailSerializer(order, context={"request": request}).data)


class OrderInvoiceView(APIView):
    """GET /api/v1/orders/<uuid:pk>/invoice/ — downloads a PDF invoice."""

    permission_classes = [permissions.IsAuthenticated, IsOrderOwnerOrAdmin]

    @extend_schema(responses={200: OpenApiResponse(description="PDF invoice file.")})
    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        self.check_object_permissions(request, order)

        pdf_bytes = InvoiceService.generate_invoice_pdf(order)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="invoice-{order.order_number}.pdf"'
        return response


# --- Admin: order management ------------------------------------------------


class AdminOrderListView(generics.ListAPIView):
    """GET /api/v1/orders/admin/ — every order in the system, filterable by status/date (admin only)."""

    serializer_class = OrderListSerializer
    permission_classes = [IsAdmin]
    queryset = Order.objects.select_related("user").prefetch_related("items")
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend, filters.SearchFilter]
    filterset_class = OrderFilter
    search_fields = ["order_number", "user__email"]


class AdminOrderStatusUpdateView(APIView):
    """PATCH /api/v1/orders/admin/<uuid:pk>/status/ — advance an order through its lifecycle (admin only)."""

    permission_classes = [IsAdmin]

    @extend_schema(request=UpdateOrderStatusSerializer, responses={200: OrderDetailSerializer})
    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = UpdateOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = OrderService.update_status(
            order=order,
            new_status=serializer.validated_data["status"],
            note=serializer.validated_data.get("note", ""),
            changed_by=request.user,
        )
        return Response(OrderDetailSerializer(order, context={"request": request}).data)


class AdminOrderTrackingUpdateView(APIView):
    """POST /api/v1/orders/admin/<uuid:pk>/tracking/ — attach carrier tracking details (admin only)."""

    permission_classes = [IsAdmin]

    @extend_schema(request=SetTrackingInfoSerializer, responses={200: OrderDetailSerializer})
    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = SetTrackingInfoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = OrderService.set_tracking_info(order=order, **serializer.validated_data)
        return Response(OrderDetailSerializer(order, context={"request": request}).data)
