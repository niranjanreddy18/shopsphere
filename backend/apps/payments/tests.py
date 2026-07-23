"""
Tests for the payments app.

Every Stripe API call is mocked via unittest.mock.patch — these tests must
run offline (no real network access to api.stripe.com), verifying our own
integration logic (what we send Stripe, how we interpret what comes back)
rather than Stripe's own service.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import stripe
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Address, User
from apps.cart.models import Cart, CartItem
from apps.orders.models import Order
from apps.orders.services import OrderService
from apps.products.models import Category, Inventory, Product
from core.exceptions import ApplicationError

from .models import Payment, WebhookEvent
from .services import PaymentService


def _make_user(email="buyer@example.com"):
    return User.objects.create_user(email=email, password="StrongPass1!", first_name="Buyer", last_name="One")


def _make_order(user=None):
    user = user or _make_user()
    category = Category.objects.create(name="Cat")
    product = Product.objects.create(name="Widget", category=category, sku="SKU-1", price=Decimal("50.00"))
    Inventory.objects.create(product=product, quantity=10)
    cart, _ = Cart.objects.get_or_create(user=user)
    CartItem.objects.create(cart=cart, product=product, quantity=1)
    address = Address.objects.create(
        user=user, full_name="Buyer One", phone_number="+911234567890", line1="1 St",
        city="City", state="State", postal_code="12345", country="US",
    )
    return OrderService.create_order_from_cart(user=user, shipping_address_id=address.id, billing_address_id=address.id)


class PaymentServiceTests(TestCase):
    def setUp(self):
        self.order = _make_order()

    @patch("apps.payments.services.stripe.PaymentIntent.create")
    def test_create_payment_intent_success(self, mock_create):
        mock_create.return_value = MagicMock(id="pi_test_123", client_secret="pi_test_123_secret")

        payment = PaymentService.create_payment_intent(order=self.order)

        self.assertEqual(payment.stripe_payment_intent_id, "pi_test_123")
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertEqual(payment.client_secret, "pi_test_123_secret")
        mock_create.assert_called_once()
        # Amount must be converted to the smallest currency unit (cents).
        self.assertEqual(mock_create.call_args.kwargs["amount"], int(self.order.total_amount * 100))

    @patch("apps.payments.services.stripe.PaymentIntent.create")
    def test_create_payment_intent_for_already_paid_order_raises(self, mock_create):
        mock_create.return_value = MagicMock(id="pi_test_1", client_secret="secret")
        payment = PaymentService.create_payment_intent(order=self.order)
        payment.status = Payment.Status.SUCCEEDED
        payment.save()

        with self.assertRaises(ApplicationError):
            PaymentService.create_payment_intent(order=self.order)

    @patch("apps.payments.services.stripe.PaymentIntent.create")
    def test_create_payment_intent_stripe_error_raises_application_error(self, mock_create):
        mock_create.side_effect = stripe.error.StripeError("card declined")

        with self.assertRaises(ApplicationError):
            PaymentService.create_payment_intent(order=self.order)

    @patch("apps.payments.services.stripe.PaymentIntent.retrieve")
    @patch("apps.payments.services.stripe.PaymentIntent.create")
    def test_sync_payment_status_marks_succeeded_and_confirms_order(self, mock_create, mock_retrieve):
        mock_create.return_value = MagicMock(id="pi_test_2", client_secret="secret")
        payment = PaymentService.create_payment_intent(order=self.order)
        mock_retrieve.return_value = MagicMock(status="succeeded", last_payment_error=None)

        payment = PaymentService.sync_payment_status(payment=payment)

        self.assertEqual(payment.status, Payment.Status.SUCCEEDED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.CONFIRMED)

    @patch("apps.payments.services.stripe.PaymentIntent.retrieve")
    @patch("apps.payments.services.stripe.PaymentIntent.create")
    def test_sync_payment_status_marks_failed(self, mock_create, mock_retrieve):
        mock_create.return_value = MagicMock(id="pi_test_3", client_secret="secret")
        payment = PaymentService.create_payment_intent(order=self.order)
        mock_retrieve.return_value = MagicMock(
            status="requires_payment_method", last_payment_error={"message": "Your card was declined."}
        )

        payment = PaymentService.sync_payment_status(payment=payment)

        self.assertEqual(payment.status, Payment.Status.FAILED)
        self.assertEqual(payment.failure_reason, "Your card was declined.")

    @patch("apps.payments.services.stripe.Webhook.construct_event")
    @patch("apps.payments.services.stripe.PaymentIntent.create")
    def test_handle_webhook_event_succeeded(self, mock_create, mock_construct):
        mock_create.return_value = MagicMock(id="pi_test_4", client_secret="secret")
        PaymentService.create_payment_intent(order=self.order)

        mock_construct.return_value = {
            "id": "evt_1", "type": "payment_intent.succeeded", "data": {"object": {"id": "pi_test_4"}}
        }

        webhook_event = PaymentService.handle_webhook_event(payload=b"{}", sig_header="sig")

        self.assertTrue(webhook_event.processed)
        payment = Payment.objects.get(stripe_payment_intent_id="pi_test_4")
        self.assertEqual(payment.status, Payment.Status.SUCCEEDED)

    @patch("apps.payments.services.stripe.Webhook.construct_event")
    def test_handle_webhook_event_is_idempotent(self, mock_construct):
        mock_construct.return_value = {
            "id": "evt_dupe", "type": "payment_intent.succeeded", "data": {"object": {"id": "pi_unknown"}}
        }

        PaymentService.handle_webhook_event(payload=b"{}", sig_header="sig")
        PaymentService.handle_webhook_event(payload=b"{}", sig_header="sig")

        self.assertEqual(WebhookEvent.objects.filter(stripe_event_id="evt_dupe").count(), 1)

    @patch("apps.payments.services.stripe.Webhook.construct_event")
    def test_handle_webhook_event_invalid_signature_raises(self, mock_construct):
        mock_construct.side_effect = stripe.error.SignatureVerificationError("bad sig", "sig_header")

        with self.assertRaises(ApplicationError):
            PaymentService.handle_webhook_event(payload=b"{}", sig_header="bad")


class PaymentAPITests(APITestCase):
    def setUp(self):
        self.user = _make_user()
        self.order = _make_order(self.user)
        self.client.force_authenticate(user=self.user)

    @patch("apps.payments.services.stripe.PaymentIntent.create")
    def test_create_payment_intent_endpoint(self, mock_create):
        mock_create.return_value = MagicMock(id="pi_api_1", client_secret="secret_abc")

        response = self.client.post(reverse("payments:create-intent"), {"order_id": str(self.order.id)})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["client_secret"], "secret_abc")
        self.assertIn("publishable_key", response.data)

    def test_create_payment_intent_for_others_order_forbidden(self):
        other_user = _make_user(email="other@example.com")
        self.client.force_authenticate(user=other_user)

        response = self.client.post(reverse("payments:create-intent"), {"order_id": str(self.order.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("apps.payments.services.stripe.PaymentIntent.create")
    def test_order_payment_list_endpoint(self, mock_create):
        mock_create.return_value = MagicMock(id="pi_api_2", client_secret="secret")
        PaymentService.create_payment_intent(order=self.order)

        response = self.client.get(reverse("payments:order-payments", args=[self.order.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    @patch("apps.payments.services.stripe.Webhook.construct_event")
    def test_webhook_endpoint_does_not_require_authentication(self, mock_construct):
        mock_construct.return_value = {
            "id": "evt_api_1", "type": "payment_intent.succeeded", "data": {"object": {"id": "pi_unknown"}}
        }
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("payments:webhook"), data="{}", content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=1,v1=abc",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
