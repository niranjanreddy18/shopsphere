"""
API views for the payments domain.

Views stay thin: parse/validate input via serializers, delegate to
PaymentService, and shape the HTTP response. The webhook view is the one
deliberate exception to "always require auth" — Stripe itself is the
caller, authenticated instead via signature verification inside
PaymentService.handle_webhook_event.
"""

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from core.exceptions import ApplicationError

from .models import Payment
from .permissions import IsPaymentOwnerOrAdmin
from .serializers import (
    CreatePaymentIntentResponseSerializer,
    CreatePaymentIntentSerializer,
    PaymentSerializer,
)
from .services import PaymentService


class CreatePaymentIntentView(APIView):
    """
    POST /api/v1/payments/create-intent/

    Creates a Stripe PaymentIntent for a PENDING order the caller owns, and
    returns the client secret the frontend needs to mount Stripe Elements
    and confirm the card payment.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=CreatePaymentIntentSerializer, responses={201: CreatePaymentIntentResponseSerializer})
    def post(self, request):
        serializer = CreatePaymentIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = get_object_or_404(Order, pk=serializer.validated_data["order_id"])
        if order.user_id != request.user.id:
            raise ApplicationError("You do not have permission to pay for this order.", code="forbidden", status_code=403)

        payment = PaymentService.create_payment_intent(order=order)

        return Response(
            {
                "payment": PaymentSerializer(payment).data,
                "client_secret": payment.client_secret,
                "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentStatusSyncView(APIView):
    """
    GET /api/v1/payments/<uuid:pk>/sync/

    Dev-friendly fallback that force-refreshes a payment's status directly
    from Stripe (see PaymentService docstring for when this is needed
    versus relying on the webhook alone).
    """

    permission_classes = [permissions.IsAuthenticated, IsPaymentOwnerOrAdmin]

    @extend_schema(responses=PaymentSerializer)
    def get(self, request, pk):
        payment = get_object_or_404(Payment, pk=pk)
        self.check_object_permissions(request, payment)
        payment = PaymentService.sync_payment_status(payment=payment)
        return Response(PaymentSerializer(payment).data)


class OrderPaymentListView(generics.ListAPIView):
    """GET /api/v1/payments/order/<uuid:order_id>/ — every payment attempt made against one order."""

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()
        order = get_object_or_404(Order, pk=self.kwargs["order_id"])
        if order.user_id != self.request.user.id and self.request.user.role != self.request.user.Role.ADMIN:
            return Payment.objects.none()
        return Payment.objects.filter(order=order)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    POST /api/v1/payments/webhook/

    Receives Stripe webhook deliveries. Authentication is signature-based
    (Stripe-Signature header), not session/JWT — see
    PaymentService.handle_webhook_event. CSRF protection is disabled for
    this endpoint specifically because Stripe's servers can't supply a CSRF
    token; signature verification serves the equivalent purpose.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    parser_classes = [JSONParser]

    @extend_schema(request=None, responses={200: OpenApiResponse(description="Webhook processed.")})
    def post(self, request):
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        PaymentService.handle_webhook_event(payload=request.body, sig_header=sig_header)
        return Response({"received": True}, status=status.HTTP_200_OK)
