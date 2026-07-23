"""Tests for the coupons app: model, service, and API."""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from core.exceptions import ApplicationError

from .models import Coupon, CouponUsage
from .services import CouponService


def _make_coupon(**kwargs):
    now = timezone.now()
    defaults = {
        "code": "SAVE10",
        "discount_type": Coupon.DiscountType.PERCENTAGE,
        "discount_value": Decimal("10"),
        "valid_from": now - timedelta(days=1),
        "valid_until": now + timedelta(days=30),
    }
    defaults.update(kwargs)
    return Coupon.objects.create(**defaults)


class CouponServiceTests(TestCase):
    def test_validate_valid_percentage_coupon(self):
        _make_coupon(discount_value=Decimal("20"))
        coupon, discount = CouponService.validate_coupon(code="save10", subtotal=Decimal("100.00"))
        self.assertEqual(discount, Decimal("20.00"))

    def test_percentage_discount_capped_by_max(self):
        _make_coupon(discount_value=Decimal("50"), max_discount_amount=Decimal("30.00"))
        _, discount = CouponService.validate_coupon(code="SAVE10", subtotal=Decimal("200.00"))
        self.assertEqual(discount, Decimal("30.00"))

    def test_fixed_discount(self):
        _make_coupon(discount_type=Coupon.DiscountType.FIXED, discount_value=Decimal("15.00"))
        _, discount = CouponService.validate_coupon(code="SAVE10", subtotal=Decimal("100.00"))
        self.assertEqual(discount, Decimal("15.00"))

    def test_discount_never_exceeds_subtotal(self):
        _make_coupon(discount_type=Coupon.DiscountType.FIXED, discount_value=Decimal("500.00"))
        _, discount = CouponService.validate_coupon(code="SAVE10", subtotal=Decimal("50.00"))
        self.assertEqual(discount, Decimal("50.00"))

    def test_invalid_code_raises(self):
        with self.assertRaises(ApplicationError):
            CouponService.validate_coupon(code="NOPE", subtotal=Decimal("100.00"))

    def test_expired_coupon_raises(self):
        _make_coupon(valid_until=timezone.now() - timedelta(days=1))
        with self.assertRaises(ApplicationError):
            CouponService.validate_coupon(code="SAVE10", subtotal=Decimal("100.00"))

    def test_minimum_order_not_met_raises(self):
        _make_coupon(min_order_amount=Decimal("200.00"))
        with self.assertRaises(ApplicationError):
            CouponService.validate_coupon(code="SAVE10", subtotal=Decimal("50.00"))

    def test_usage_limit_reached_raises(self):
        _make_coupon(usage_limit=1, times_used=1)
        with self.assertRaises(ApplicationError):
            CouponService.validate_coupon(code="SAVE10", subtotal=Decimal("100.00"))

    def test_per_user_limit_enforced(self):
        coupon = _make_coupon(usage_limit_per_user=1)
        user = User.objects.create_user(email="c@example.com", password="StrongPass1!", first_name="A", last_name="B")
        CouponUsage.objects.create(coupon=coupon, user=user, discount_amount=Decimal("10.00"))
        with self.assertRaises(ApplicationError):
            CouponService.validate_coupon(code="SAVE10", subtotal=Decimal("100.00"), user=user)

    def test_record_usage_increments_times_used(self):
        coupon = _make_coupon()
        user = User.objects.create_user(email="d@example.com", password="StrongPass1!", first_name="A", last_name="B")
        CouponService.record_usage(coupon=coupon, user=user, discount_amount=Decimal("10.00"))
        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 1)


class CouponAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password="StrongPass1!", first_name="A", last_name="B"
        )
        self.customer = User.objects.create_user(
            email="cust@example.com", password="StrongPass1!", first_name="C", last_name="D"
        )

    def test_validate_endpoint_public(self):
        _make_coupon()
        response = self.client.post(reverse("coupons:coupon-validate"), {"code": "SAVE10", "subtotal": "100.00"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])

    def test_validate_endpoint_invalid_code(self):
        response = self.client.post(reverse("coupons:coupon-validate"), {"code": "NOPE", "subtotal": "100.00"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_manage_coupons(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(reverse("coupons:coupon-list-create"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_coupon(self):
        self.client.force_authenticate(user=self.admin)
        now = timezone.now()
        response = self.client.post(
            reverse("coupons:coupon-list-create"),
            {
                "code": "WELCOME15",
                "discount_type": "PERCENTAGE",
                "discount_value": "15.00",
                "valid_from": now.isoformat(),
                "valid_until": (now + timedelta(days=10)).isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Coupon.objects.filter(code="WELCOME15").exists())
