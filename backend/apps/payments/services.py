"""
Service layer for the payments domain — Stripe test-mode integration.

Design decision (webhook-first, with a dev-friendly fallback):
    The authoritative source of truth for "did this payment actually
    succeed" is Stripe's webhook (`PaymentService.handle_webhook_event`) —
    never the client-side confirmation alone, which a malicious or buggy
    client could spoof. In local development, where `localhost` isn't
    reachable from Stripe's servers without the Stripe CLI's `listen
    --forward-to` command, `sync_payment_status` lets the frontend force a
    fresh read of the PaymentIntent directly from Stripe's API as a
    fallback — it performs the exact same status-update logic as the
    webhook handler, just triggered by a poll instead of a push.
"""

import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

import stripe

from core.exceptions import ApplicationError

from .models import Payment, WebhookEvent

logger = logging.getLogger("apps")


class PaymentService:
    """Creates Stripe PaymentIntents and reconciles their status against local Payment records."""

    @staticmethod
    def _stripe():
        stripe.api_key = settings.STRIPE_SECRET_KEY
        return stripe

    @staticmethod
    @transaction.atomic
    def create_payment_intent(*, order) -> Payment:
        """
        Creates a Stripe PaymentIntent for an order's total and a matching
        local Payment record in PENDING status. The order's own `id` is
        attached as PaymentIntent metadata so a webhook event (which only
        carries the PaymentIntent ID) can always be traced back to the
        order without a separate lookup table.
        """
        if order.status != order.Status.PENDING:
            raise ApplicationError(
                f"Cannot create a payment for an order in '{order.status}' status.", code="invalid_order_status"
            )

        existing = order.payments.filter(status=Payment.Status.SUCCEEDED).first()
        if existing:
            raise ApplicationError("This order has already been paid.", code="already_paid")

        stripe_client = PaymentService._stripe()
        try:
            intent = stripe_client.PaymentIntent.create(
                amount=int(order.total_amount * 100),  # Stripe amounts are in the smallest currency unit (cents)
                currency=settings.STRIPE_CURRENCY,
                metadata={"order_id": str(order.id), "order_number": order.order_number},
                automatic_payment_methods={"enabled": True},
            )
        except stripe.error.StripeError as exc:
            logger.error("Stripe PaymentIntent creation failed for order %s: %s", order.order_number, exc)
            raise ApplicationError(f"Payment initialisation failed: {exc.user_message or str(exc)}", code="stripe_error") from exc

        payment = Payment.objects.create(
            order=order,
            amount=order.total_amount,
            currency=settings.STRIPE_CURRENCY,
            stripe_payment_intent_id=intent.id,
            status=Payment.Status.PENDING,
        )
        # Client secret isn't persisted on the model — it's only needed
        # once, immediately, to mount Stripe Elements on the frontend, and
        # deliberately isn't treated as data worth storing long-term.
        payment.client_secret = intent.client_secret
        return payment

    @staticmethod
    @transaction.atomic
    def _apply_status(*, payment: Payment, stripe_status: str, failure_reason: str = "") -> Payment:
        """
        Translates a Stripe PaymentIntent status into a local Payment +
        Order status update. Shared by both the webhook handler and the
        dev-mode sync fallback so the two paths can never diverge in what
        "succeeded" or "failed" actually does.
        """
        from apps.notifications.services import NotificationService
        from apps.orders.services import OrderService

        if stripe_status == "succeeded" and payment.status != Payment.Status.SUCCEEDED:
            payment.status = Payment.Status.SUCCEEDED
            payment.paid_at = timezone.now()
            payment.save(update_fields=["status", "paid_at", "updated_at"])

            OrderService.update_status(
                order=payment.order, new_status=payment.order.Status.CONFIRMED,
                note="Payment received via Stripe.", changed_by=None,
            )
            NotificationService.notify_payment_result(payment=payment, success=True)

        elif stripe_status in ("requires_payment_method", "canceled") and payment.status != Payment.Status.FAILED:
            payment.status = Payment.Status.FAILED
            payment.failure_reason = failure_reason
            payment.save(update_fields=["status", "failure_reason", "updated_at"])
            NotificationService.notify_payment_result(payment=payment, success=False)

        return payment

    @staticmethod
    def sync_payment_status(*, payment: Payment) -> Payment:
        """Dev-mode fallback: pulls the PaymentIntent's current status directly from Stripe and applies it."""
        stripe_client = PaymentService._stripe()
        try:
            intent = stripe_client.PaymentIntent.retrieve(payment.stripe_payment_intent_id)
        except stripe.error.StripeError as exc:
            raise ApplicationError(f"Could not verify payment status: {exc.user_message or str(exc)}", code="stripe_error") from exc

        failure_reason = ""
        if intent.status == "requires_payment_method" and intent.last_payment_error:
            failure_reason = intent.last_payment_error.get("message", "")

        return PaymentService._apply_status(payment=payment, stripe_status=intent.status, failure_reason=failure_reason)

    @staticmethod
    @transaction.atomic
    def handle_webhook_event(*, payload: bytes, sig_header: str) -> WebhookEvent:
        """
        Verifies and processes an incoming Stripe webhook delivery.

        Signature verification (`stripe.Webhook.construct_event`) is what
        proves the request genuinely came from Stripe and wasn't forged —
        skipping it would let anyone POST a fake "payment succeeded" event
        directly to this endpoint. Idempotency is enforced by checking
        `WebhookEvent.stripe_event_id` before processing, since Stripe's
        delivery guarantee is at-least-once, not exactly-once.
        """
        stripe_client = PaymentService._stripe()
        try:
            event = stripe_client.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except (ValueError, stripe.error.SignatureVerificationError) as exc:
            raise ApplicationError("Invalid webhook signature.", code="invalid_signature") from exc

        if WebhookEvent.objects.filter(stripe_event_id=event["id"]).exists():
            logger.info("Duplicate webhook delivery ignored: %s", event["id"])
            return WebhookEvent.objects.get(stripe_event_id=event["id"])

        webhook_event = WebhookEvent.objects.create(
            stripe_event_id=event["id"], event_type=event["type"], payload=event["data"]["object"]
        )

        intent_data = event["data"]["object"]
        payment = Payment.objects.filter(stripe_payment_intent_id=intent_data["id"]).first()

        if payment is not None:
            if event["type"] == "payment_intent.succeeded":
                PaymentService._apply_status(payment=payment, stripe_status="succeeded")
            elif event["type"] == "payment_intent.payment_failed":
                last_error = intent_data.get("last_payment_error") or {}
                PaymentService._apply_status(
                    payment=payment, stripe_status="requires_payment_method",
                    failure_reason=last_error.get("message", ""),
                )

        webhook_event.processed = True
        webhook_event.save(update_fields=["processed", "updated_at"])
        return webhook_event
