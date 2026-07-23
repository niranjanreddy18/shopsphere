"""
Models for the payments domain.

Contains:
    - Payment: one row per payment *attempt* against an order (an order can
      have more than one, e.g. a failed card retried with a new one) —
      never a OneToOneField to Order, since that would make a failed-then-
      retried payment impossible to represent.
    - WebhookEvent: an idempotency/audit log of every Stripe webhook
      delivery received, keyed on Stripe's own event ID.
"""

from django.db import models

from core.models import BaseModel


class Payment(BaseModel):
    """A single payment attempt against an order, tracked via a Stripe PaymentIntent."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCEEDED = "SUCCEEDED", "Succeeded"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    class Provider(models.TextChoices):
        STRIPE = "STRIPE", "Stripe"

    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=10, choices=Provider.choices, default=Provider.STRIPE)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="usd")

    stripe_payment_intent_id = models.CharField(max_length=255, unique=True, db_index=True)
    failure_reason = models.CharField(max_length=500, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payments_payment"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["order", "status"])]

    def __str__(self) -> str:
        return f"Payment({self.stripe_payment_intent_id}, {self.status})"


class WebhookEvent(BaseModel):
    """
    Idempotency log for incoming Stripe webhook deliveries.

    Stripe may deliver the same event more than once (at-least-once
    delivery is part of its design); recording each event's ID here before
    processing it lets `PaymentService.handle_webhook_event` short-circuit
    on a duplicate delivery instead of double-applying a status change.
    """

    stripe_event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)

    class Meta:
        db_table = "payments_webhook_event"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.event_type} ({self.stripe_event_id})"
