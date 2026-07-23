"""Serializers for the payments domain."""

from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id", "order", "order_number", "provider", "status", "amount", "currency",
            "stripe_payment_intent_id", "failure_reason", "paid_at", "created_at",
        ]
        read_only_fields = fields


class CreatePaymentIntentSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()


class CreatePaymentIntentResponseSerializer(serializers.Serializer):
    """Documents the shape of CreatePaymentIntentView's response for Swagger."""

    payment = PaymentSerializer()
    client_secret = serializers.CharField()
    publishable_key = serializers.CharField()
