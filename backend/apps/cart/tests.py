"""Tests for the cart app: models, services, and API endpoints."""

from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.products.models import Category, Inventory, Product
from core.exceptions import ApplicationError

from .models import Cart, CartItem
from .services import CartService, ShippingService, TaxService


def _make_product(name="Widget", price=Decimal("50.00"), stock=10, sku=None):
    category = Category.objects.create(name=f"Category for {name}")
    product = Product.objects.create(name=name, category=category, sku=sku or f"SKU-{name}", price=price)
    Inventory.objects.create(product=product, quantity=stock)
    return product


class CartModelTests(TestCase):
    def test_cart_requires_user_xor_token(self):
        user = User.objects.create_user(email="u@example.com", password="StrongPass1!", first_name="A", last_name="B")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Cart.objects.create(user=user, cart_token=Cart.generate_token())

    def test_cart_item_line_total(self):
        product = _make_product(price=Decimal("25.00"))
        cart = Cart.objects.create(cart_token=Cart.generate_token())
        item = CartItem.objects.create(cart=cart, product=product, quantity=3)
        self.assertEqual(item.line_total, Decimal("75.00"))


class CartServiceTests(TestCase):
    def setUp(self):
        self.product = _make_product(price=Decimal("40.00"), stock=5)
        self.cart = Cart.objects.create(cart_token=Cart.generate_token())

    def test_add_item_creates_item(self):
        item = CartService.add_item(cart=self.cart, product=self.product, quantity=2)
        self.assertEqual(item.quantity, 2)

    def test_add_item_twice_sums_quantity(self):
        CartService.add_item(cart=self.cart, product=self.product, quantity=2)
        item = CartService.add_item(cart=self.cart, product=self.product, quantity=1)
        self.assertEqual(item.quantity, 3)

    def test_add_item_beyond_stock_raises(self):
        with self.assertRaises(ApplicationError):
            CartService.add_item(cart=self.cart, product=self.product, quantity=999)

    def test_update_quantity(self):
        item = CartService.add_item(cart=self.cart, product=self.product, quantity=1)
        CartService.update_quantity(cart_item=item, quantity=4)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 4)

    def test_remove_item(self):
        item = CartService.add_item(cart=self.cart, product=self.product, quantity=1)
        CartService.remove_item(cart_item=item)
        self.assertFalse(CartItem.objects.filter(pk=item.pk).exists())

    def test_save_for_later_and_move_to_cart(self):
        item = CartService.add_item(cart=self.cart, product=self.product, quantity=1)
        CartService.save_for_later(cart_item=item)
        item.refresh_from_db()
        self.assertTrue(item.is_saved_for_later)

        CartService.move_to_cart(cart_item=item)
        item.refresh_from_db()
        self.assertFalse(item.is_saved_for_later)

    def test_merge_guest_cart_sums_quantities(self):
        user = User.objects.create_user(email="m@example.com", password="StrongPass1!", first_name="A", last_name="B")
        user_cart, _ = CartService.get_or_create_cart(user=user)
        CartService.add_item(cart=user_cart, product=self.product, quantity=1)
        CartService.add_item(cart=self.cart, product=self.product, quantity=2)

        merged = CartService.merge_guest_cart_into_user_cart(guest_cart=self.cart, user=user)
        item = merged.items.get(product=self.product)
        self.assertEqual(item.quantity, 3)
        self.assertFalse(Cart.objects.filter(pk=self.cart.pk).exists())

    def test_get_summary_calculates_totals(self):
        CartService.add_item(cart=self.cart, product=self.product, quantity=2)  # subtotal = 80.00
        summary = CartService.get_summary(cart=self.cart)
        self.assertEqual(summary["subtotal"], Decimal("80.00"))
        self.assertEqual(summary["shipping"], ShippingService.calculate_shipping(Decimal("80.00")))
        self.assertEqual(summary["tax"], TaxService.calculate_tax(Decimal("80.00")))

    def test_saved_for_later_items_excluded_from_summary(self):
        item = CartService.add_item(cart=self.cart, product=self.product, quantity=1)
        CartService.save_for_later(cart_item=item)
        summary = CartService.get_summary(cart=self.cart)
        self.assertEqual(summary["subtotal"], Decimal("0.00"))


class ShippingTaxServiceTests(TestCase):
    def test_free_shipping_above_threshold(self):
        self.assertEqual(ShippingService.calculate_shipping(Decimal("150.00")), Decimal("0.00"))

    def test_flat_shipping_below_threshold(self):
        self.assertEqual(ShippingService.calculate_shipping(Decimal("50.00")), Decimal("9.99"))

    def test_tax_calculation(self):
        self.assertEqual(TaxService.calculate_tax(Decimal("100.00")), Decimal("8.00"))


class CartAPITests(APITestCase):
    def setUp(self):
        self.product = _make_product(price=Decimal("30.00"), stock=10)

    def test_get_cart_as_guest_issues_token(self):
        response = self.client.get(reverse("cart:cart-detail"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("X-Cart-Token", response)

    def test_add_item_as_guest_and_retrieve_with_token(self):
        add_response = self.client.post(
            reverse("cart:cart-item-add"), {"product_id": str(self.product.id), "quantity": 2}
        )
        self.assertEqual(add_response.status_code, status.HTTP_201_CREATED)
        token = add_response["X-Cart-Token"]

        get_response = self.client.get(reverse("cart:cart-detail"), HTTP_X_CART_TOKEN=token)
        self.assertEqual(len(get_response.data["items"]), 1)
        self.assertEqual(get_response.data["items"][0]["quantity"], 2)

    def test_add_item_as_authenticated_user(self):
        user = User.objects.create_user(email="cart@example.com", password="StrongPass1!", first_name="A", last_name="B")
        self.client.force_authenticate(user=user)
        response = self.client.post(
            reverse("cart:cart-item-add"), {"product_id": str(self.product.id), "quantity": 1}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("X-Cart-Token", response)

    def test_update_and_delete_cart_item(self):
        add_response = self.client.post(
            reverse("cart:cart-item-add"), {"product_id": str(self.product.id), "quantity": 1}
        )
        token = add_response["X-Cart-Token"]
        item_id = add_response.data["items"][0]["id"]

        patch_response = self.client.patch(
            reverse("cart:cart-item-detail", args=[item_id]), {"quantity": 5}, HTTP_X_CART_TOKEN=token
        )
        self.assertEqual(patch_response.data["items"][0]["quantity"], 5)

        delete_response = self.client.delete(
            reverse("cart:cart-item-detail", args=[item_id]), HTTP_X_CART_TOKEN=token
        )
        self.assertEqual(len(delete_response.data["items"]), 0)

    def test_merge_cart_requires_authentication(self):
        response = self.client.post(reverse("cart:cart-merge"), {"cart_token": "x"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_merge_cart_folds_guest_items_into_user_cart(self):
        guest_response = self.client.post(
            reverse("cart:cart-item-add"), {"product_id": str(self.product.id), "quantity": 2}
        )
        guest_token = guest_response["X-Cart-Token"]

        user = User.objects.create_user(email="merge@example.com", password="StrongPass1!", first_name="A", last_name="B")
        self.client.force_authenticate(user=user)
        merge_response = self.client.post(reverse("cart:cart-merge"), {"cart_token": guest_token})

        self.assertEqual(merge_response.status_code, status.HTTP_200_OK)
        self.assertEqual(merge_response.data["items"][0]["quantity"], 2)
