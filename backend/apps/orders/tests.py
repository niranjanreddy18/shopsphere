"""Tests for the orders app: models, services (checkout flow), and API endpoints."""

from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Address, User
from apps.cart.models import Cart, CartItem
from apps.coupons.models import Coupon
from apps.products.models import Category, Inventory, Product
from core.exceptions import ApplicationError

from .models import Order, OrderStatusHistory
from .services import InvoiceService, OrderService
from .validators import validate_status_transition


def _make_user(email="buyer@example.com"):
    return User.objects.create_user(email=email, password="StrongPass1!", first_name="Buyer", last_name="One")


def _make_product(name="Widget", price=Decimal("50.00"), stock=10, sku=None):
    category = Category.objects.create(name=f"Category for {name}-{sku or ''}")
    product = Product.objects.create(name=name, category=category, sku=sku or f"SKU-{name}-{price}", price=price)
    Inventory.objects.create(product=product, quantity=stock)
    return product


def _make_address(user, **overrides):
    defaults = dict(
        user=user, full_name="Buyer One", phone_number="+911234567890", line1="123 Main St",
        city="Springfield", state="IL", postal_code="62704", country="USA",
    )
    defaults.update(overrides)
    return Address.objects.create(**defaults)


def _make_cart_with_item(user, product, quantity=2):
    cart, _ = Cart.objects.get_or_create(user=user)
    CartItem.objects.create(cart=cart, product=product, quantity=quantity)
    return cart


class OrderModelTests(TestCase):
    def test_order_number_is_auto_generated_and_unique(self):
        user = _make_user()
        order1 = Order.objects.create(
            user=user, subtotal=Decimal("10"), total_amount=Decimal("10"),
            shipping_full_name="A", shipping_phone_number="1", shipping_line1="l1", shipping_city="c",
            shipping_state="s", shipping_postal_code="p", shipping_country="US",
            billing_full_name="A", billing_phone_number="1", billing_line1="l1", billing_city="c",
            billing_state="s", billing_postal_code="p", billing_country="US",
        )
        order2 = Order.objects.create(
            user=user, subtotal=Decimal("10"), total_amount=Decimal("10"),
            shipping_full_name="A", shipping_phone_number="1", shipping_line1="l1", shipping_city="c",
            shipping_state="s", shipping_postal_code="p", shipping_country="US",
            billing_full_name="A", billing_phone_number="1", billing_line1="l1", billing_city="c",
            billing_state="s", billing_postal_code="p", billing_country="US",
        )
        self.assertNotEqual(order1.order_number, order2.order_number)
        self.assertTrue(order1.order_number.startswith("ORD-"))

    def test_is_cancellable_by_customer(self):
        user = _make_user()
        order = Order(user=user, status=Order.Status.SHIPPED)
        self.assertFalse(order.is_cancellable_by_customer)
        order.status = Order.Status.PENDING
        self.assertTrue(order.is_cancellable_by_customer)


class StatusTransitionValidatorTests(TestCase):
    def test_legal_transition_does_not_raise(self):
        validate_status_transition(Order.Status.PENDING, Order.Status.CONFIRMED)

    def test_illegal_transition_raises(self):
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            validate_status_transition(Order.Status.PENDING, Order.Status.SHIPPED)

    def test_terminal_status_has_no_further_transitions(self):
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            validate_status_transition(Order.Status.CANCELLED, Order.Status.PENDING)


class OrderServiceCheckoutTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.product = _make_product(price=Decimal("40.00"), stock=10)
        self.shipping_address = _make_address(self.user)
        self.billing_address = _make_address(self.user, address_type=Address.AddressType.BILLING)
        self.cart = _make_cart_with_item(self.user, self.product, quantity=2)

    def test_create_order_from_cart_success(self):
        order = OrderService.create_order_from_cart(
            user=self.user,
            shipping_address_id=self.shipping_address.id,
            billing_address_id=self.billing_address.id,
        )
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.subtotal, Decimal("80.00"))

    def test_create_order_deducts_inventory(self):
        OrderService.create_order_from_cart(
            user=self.user, shipping_address_id=self.shipping_address.id, billing_address_id=self.billing_address.id
        )
        self.product.inventory.refresh_from_db()
        self.assertEqual(self.product.inventory.quantity, 8)

    def test_create_order_clears_cart(self):
        OrderService.create_order_from_cart(
            user=self.user, shipping_address_id=self.shipping_address.id, billing_address_id=self.billing_address.id
        )
        self.assertEqual(self.cart.items.filter(is_saved_for_later=False).count(), 0)

    def test_create_order_increments_sold_count(self):
        OrderService.create_order_from_cart(
            user=self.user, shipping_address_id=self.shipping_address.id, billing_address_id=self.billing_address.id
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.sold_count, 2)

    def test_create_order_writes_initial_status_history(self):
        order = OrderService.create_order_from_cart(
            user=self.user, shipping_address_id=self.shipping_address.id, billing_address_id=self.billing_address.id
        )
        self.assertEqual(order.status_history.count(), 1)
        self.assertEqual(order.status_history.first().status, Order.Status.PENDING)

    def test_create_order_with_empty_cart_raises(self):
        self.cart.items.all().delete()
        with self.assertRaises(ApplicationError):
            OrderService.create_order_from_cart(
                user=self.user, shipping_address_id=self.shipping_address.id, billing_address_id=self.billing_address.id
            )

    def test_create_order_with_insufficient_stock_raises_and_rolls_back(self):
        self.product.inventory.quantity = 1
        self.product.inventory.save()
        with self.assertRaises(ApplicationError):
            OrderService.create_order_from_cart(
                user=self.user, shipping_address_id=self.shipping_address.id, billing_address_id=self.billing_address.id
            )
        # Transaction rollback: no order should have been persisted.
        self.assertEqual(Order.objects.count(), 0)

    def test_create_order_with_valid_coupon_applies_discount(self):
        from django.utils import timezone
        from datetime import timedelta

        Coupon.objects.create(
            code="SAVE10", discount_type=Coupon.DiscountType.FIXED, discount_value=Decimal("10.00"),
            valid_from=timezone.now() - timedelta(days=1), valid_until=timezone.now() + timedelta(days=1),
        )
        order = OrderService.create_order_from_cart(
            user=self.user, shipping_address_id=self.shipping_address.id,
            billing_address_id=self.billing_address.id, coupon_code="SAVE10",
        )
        self.assertEqual(order.discount_amount, Decimal("10.00"))

    def test_create_order_with_another_users_address_raises(self):
        other_user = _make_user(email="other@example.com")
        other_address = _make_address(other_user)
        with self.assertRaises(ApplicationError):
            OrderService.create_order_from_cart(
                user=self.user, shipping_address_id=other_address.id, billing_address_id=self.billing_address.id
            )


class OrderServiceLifecycleTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.product = _make_product(stock=10)
        self.shipping_address = _make_address(self.user)
        self.billing_address = _make_address(self.user)
        _make_cart_with_item(self.user, self.product, quantity=3)
        self.order = OrderService.create_order_from_cart(
            user=self.user, shipping_address_id=self.shipping_address.id, billing_address_id=self.billing_address.id
        )

    def test_cancel_order_restocks_inventory(self):
        OrderService.cancel_order(order=self.order, cancelled_by=self.user, reason="Changed my mind")
        self.product.inventory.refresh_from_db()
        self.assertEqual(self.product.inventory.quantity, 10)  # back to original

    def test_cancel_order_sets_status_and_reason(self):
        order = OrderService.cancel_order(order=self.order, cancelled_by=self.user, reason="Changed my mind")
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(order.cancellation_reason, "Changed my mind")

    def test_cancel_already_cancelled_order_raises(self):
        OrderService.cancel_order(order=self.order, cancelled_by=self.user)
        with self.assertRaises(Exception):
            OrderService.cancel_order(order=self.order, cancelled_by=self.user)

    def test_update_status_records_history(self):
        OrderService.update_status(order=self.order, new_status=Order.Status.CONFIRMED, changed_by=self.user)
        self.assertEqual(self.order.status_history.count(), 2)

    def test_full_lifecycle_transition_chain(self):
        order = self.order
        for next_status in [Order.Status.CONFIRMED, Order.Status.PROCESSING, Order.Status.SHIPPED, Order.Status.DELIVERED]:
            order = OrderService.update_status(order=order, new_status=next_status, changed_by=self.user)
        self.assertEqual(order.status, Order.Status.DELIVERED)

    def test_set_tracking_info(self):
        order = OrderService.set_tracking_info(
            order=self.order, tracking_number="1Z999", carrier="UPS", estimated_delivery_date=None
        )
        self.assertEqual(order.tracking_number, "1Z999")
        self.assertEqual(order.carrier, "UPS")


class InvoiceServiceTests(TestCase):
    def test_generate_invoice_pdf_returns_pdf_bytes(self):
        user = _make_user()
        product = _make_product(stock=5)
        _make_cart_with_item(user, product, quantity=1)
        order = OrderService.create_order_from_cart(
            user=user, shipping_address_id=_make_address(user).id, billing_address_id=_make_address(user).id
        )
        pdf_bytes = InvoiceService.generate_invoice_pdf(order)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))


class CheckoutAPITests(APITestCase):
    def setUp(self):
        self.user = _make_user()
        self.product = _make_product(stock=10)
        self.shipping_address = _make_address(self.user)
        self.billing_address = _make_address(self.user)
        _make_cart_with_item(self.user, self.product, quantity=2)
        self.client.force_authenticate(user=self.user)
        self.checkout_url = reverse("orders:checkout")

    def test_checkout_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.checkout_url, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_checkout_success(self):
        response = self.client.post(
            self.checkout_url,
            {"shipping_address_id": str(self.shipping_address.id), "billing_address_id": str(self.billing_address.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "PENDING")

    def test_checkout_with_empty_cart_fails(self):
        Cart.objects.get(user=self.user).items.all().delete()
        response = self.client.post(
            self.checkout_url,
            {"shipping_address_id": str(self.shipping_address.id), "billing_address_id": str(self.billing_address.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OrderHistoryAndDetailAPITests(APITestCase):
    def setUp(self):
        self.user = _make_user()
        self.other_user = _make_user(email="other@example.com")
        self.product = _make_product(stock=10)
        _make_cart_with_item(self.user, self.product, quantity=1)
        self.order = OrderService.create_order_from_cart(
            user=self.user, shipping_address_id=_make_address(self.user).id, billing_address_id=_make_address(self.user).id
        )
        self.client.force_authenticate(user=self.user)

    def test_order_history_lists_own_orders(self):
        response = self.client.get(reverse("orders:order-history"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_order_detail_returns_full_order(self):
        response = self.client.get(reverse("orders:order-detail", args=[self.order.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["order_number"], self.order.order_number)

    def test_cannot_view_another_users_order(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(reverse("orders:order-detail", args=[self.order.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cancel_order_via_api(self):
        response = self.client.post(reverse("orders:order-cancel", args=[self.order.id]), {"reason": "test"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "CANCELLED")

    def test_invoice_download_returns_pdf(self):
        response = self.client.get(reverse("orders:order-invoice", args=[self.order.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")


class AdminOrderManagementAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password="StrongPass1!", first_name="Ad", last_name="Min"
        )
        self.user = _make_user()
        self.product = _make_product(stock=10)
        _make_cart_with_item(self.user, self.product, quantity=1)
        self.order = OrderService.create_order_from_cart(
            user=self.user, shipping_address_id=_make_address(self.user).id, billing_address_id=_make_address(self.user).id
        )

    def test_non_admin_cannot_list_all_orders(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("orders:admin-order-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_all_orders(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("orders:admin-order-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_admin_can_update_order_status(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(reverse("orders:admin-order-status", args=[self.order.id]), {"status": "CONFIRMED"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "CONFIRMED")

    def test_admin_can_set_tracking_info(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse("orders:admin-order-tracking", args=[self.order.id]),
            {"tracking_number": "1Z999", "carrier": "UPS"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["tracking_number"], "1Z999")
