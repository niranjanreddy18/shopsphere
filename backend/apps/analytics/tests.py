"""Tests for the analytics app: service aggregation logic and admin-only API access."""

from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Address, User
from apps.cart.models import Cart, CartItem
from apps.orders.models import Order
from apps.orders.services import OrderService
from apps.products.models import Category, Inventory, Product

from .services import AnalyticsService


def _make_user(email="buyer@example.com"):
    return User.objects.create_user(email=email, password="StrongPass1!", first_name="B", last_name="U")


def _make_order(user, price=Decimal("50.00"), status_override=None):
    category = Category.objects.create(name=f"Cat-{price}-{user.email}")
    product = Product.objects.create(name="Widget", category=category, sku=f"SKU-{price}-{user.email}", price=price)
    Inventory.objects.create(product=product, quantity=10)
    cart, _ = Cart.objects.get_or_create(user=user)
    CartItem.objects.create(cart=cart, product=product, quantity=1)
    address = Address.objects.create(
        user=user, full_name="B U", phone_number="+911234567890", line1="1 St",
        city="City", state="State", postal_code="12345", country="US",
    )
    order = OrderService.create_order_from_cart(user=user, shipping_address_id=address.id, billing_address_id=address.id)
    if status_override:
        Order.objects.filter(pk=order.pk).update(status=status_override)
        order.refresh_from_db()
    return order


class AnalyticsServiceTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_dashboard_stats_counts_only_paid_orders_as_revenue(self):
        _make_order(self.user, price=Decimal("50.00"), status_override=Order.Status.CONFIRMED)
        _make_order(self.user, price=Decimal("30.00"))  # stays PENDING — should not count as revenue

        stats = AnalyticsService.get_dashboard_stats()

        self.assertEqual(stats["total_orders"], 2)
        self.assertGreaterEqual(stats["total_revenue"], Decimal("50.00"))
        # The PENDING order's total shouldn't be included in revenue.
        self.assertLess(stats["total_revenue"], Decimal("80.00"))

    def test_dashboard_stats_counts_customers_and_products(self):
        stats = AnalyticsService.get_dashboard_stats()
        self.assertGreaterEqual(stats["total_customers"], 1)

    def test_revenue_analytics_returns_current_month_entry(self):
        _make_order(self.user, status_override=Order.Status.CONFIRMED)
        rows = AnalyticsService.get_revenue_analytics(months=3)
        self.assertTrue(any(row["revenue"] > 0 for row in rows))

    def test_order_trends_returns_todays_entry(self):
        _make_order(self.user)
        rows = AnalyticsService.get_order_trends(days=7)
        self.assertEqual(sum(row["order_count"] for row in rows), 1)

    def test_top_products_ranks_by_units_sold(self):
        order = _make_order(self.user, price=Decimal("20.00"), status_override=Order.Status.CONFIRMED)
        top = AnalyticsService.get_top_products(limit=5)
        self.assertEqual(len(top), 1)
        self.assertEqual(top[0]["units_sold"], 1)

    def test_recent_orders_returns_newest_first(self):
        _make_order(self.user)
        _make_order(_make_user(email="second@example.com"))
        recent = AnalyticsService.get_recent_orders(limit=5)
        self.assertEqual(len(recent), 2)
        self.assertGreaterEqual(recent[0].created_at, recent[1].created_at)


class AnalyticsAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email="admin@example.com", password="StrongPass1!", first_name="A", last_name="D")
        self.user = _make_user()

    def test_dashboard_stats_requires_admin(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("analytics:dashboard-stats"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_dashboard_stats(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("analytics:dashboard-stats"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_revenue", response.data)

    def test_admin_can_view_revenue_analytics(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("analytics:revenue-analytics"), {"months": 3})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_view_top_products(self):
        _make_order(self.user, status_override=Order.Status.CONFIRMED)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("analytics:top-products"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_view_recent_orders(self):
        _make_order(self.user)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("analytics:recent-orders"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
