"""Tests for the wishlist app: model, service, and API."""

from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.products.models import Category, Inventory, Product
from core.exceptions import ApplicationError

from .models import WishlistItem
from .services import WishlistService


def _make_product(name="Widget", stock=5):
    category = Category.objects.create(name=f"Category for {name}")
    product = Product.objects.create(name=name, category=category, sku=f"SKU-{name}", price=Decimal("20.00"))
    Inventory.objects.create(product=product, quantity=stock)
    return product


def _make_user(email="u@example.com"):
    return User.objects.create_user(email=email, password="StrongPass1!", first_name="A", last_name="B")


class WishlistServiceTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.product = _make_product()

    def test_add_item(self):
        item = WishlistService.add_item(user=self.user, product=self.product)
        self.assertEqual(item.user, self.user)

    def test_add_duplicate_raises(self):
        WishlistService.add_item(user=self.user, product=self.product)
        with self.assertRaises(ApplicationError):
            WishlistService.add_item(user=self.user, product=self.product)

    def test_remove_item(self):
        WishlistService.add_item(user=self.user, product=self.product)
        WishlistService.remove_item(user=self.user, product_id=self.product.id)
        self.assertFalse(WishlistItem.objects.filter(user=self.user, product=self.product).exists())

    def test_remove_nonexistent_raises(self):
        with self.assertRaises(ApplicationError):
            WishlistService.remove_item(user=self.user, product_id=self.product.id)

    def test_move_to_cart_adds_to_cart_and_removes_from_wishlist(self):
        WishlistService.add_item(user=self.user, product=self.product)
        WishlistService.move_to_cart(user=self.user, product_id=self.product.id, quantity=2)

        self.assertFalse(WishlistItem.objects.filter(user=self.user, product=self.product).exists())
        self.assertTrue(self.user.cart.items.filter(product=self.product, quantity=2).exists())


class WishlistAPITests(APITestCase):
    def setUp(self):
        self.user = _make_user("api@example.com")
        self.product = _make_product("API Widget")
        self.client.force_authenticate(user=self.user)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("wishlist:wishlist-list-create"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_and_list(self):
        self.client.post(reverse("wishlist:wishlist-list-create"), {"product_id": str(self.product.id)})
        response = self.client.get(reverse("wishlist:wishlist-list-create"))
        self.assertEqual(response.data["count"], 1)

    def test_remove(self):
        self.client.post(reverse("wishlist:wishlist-list-create"), {"product_id": str(self.product.id)})
        response = self.client.delete(reverse("wishlist:wishlist-item-detail", args=[self.product.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_move_to_cart_endpoint(self):
        self.client.post(reverse("wishlist:wishlist-list-create"), {"product_id": str(self.product.id)})
        response = self.client.post(
            reverse("wishlist:wishlist-item-move-to-cart", args=[self.product.id]), {"quantity": 1}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.user.cart.items.filter(product=self.product).exists())

    def test_other_users_wishlist_is_isolated(self):
        other_user = _make_user("other@example.com")
        WishlistItem.objects.create(user=other_user, product=self.product)
        response = self.client.get(reverse("wishlist:wishlist-list-create"))
        self.assertEqual(response.data["count"], 0)
