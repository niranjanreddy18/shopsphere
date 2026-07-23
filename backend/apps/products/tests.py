"""Tests for the products app: models, services, and API endpoints."""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from core.exceptions import ApplicationError

from .models import Brand, Category, Inventory, Product, ProductImage, StockMovement
from .services import InventoryService, ProductService


def _make_category(name="Electronics"):
    return Category.objects.create(name=name)


def _make_product(category, **kwargs):
    stock = kwargs.pop("stock", 20)
    defaults = {
        "name": "Test Widget",
        "category": category,
        "sku": f"SKU-{Product.objects.count() + 1}",
        "price": Decimal("100.00"),
    }
    defaults.update(kwargs)
    product = Product.objects.create(**defaults)
    Inventory.objects.create(product=product, quantity=stock)
    return product


class ProductModelTests(TestCase):
    def setUp(self):
        self.category = _make_category()

    def test_slug_auto_generated(self):
        product = _make_product(self.category, name="Wireless Mouse")
        self.assertTrue(product.slug.startswith("wireless-mouse"))

    def test_effective_price_uses_discount_when_lower(self):
        product = _make_product(self.category, price=Decimal("100.00"), discount_price=Decimal("80.00"))
        self.assertEqual(product.effective_price, Decimal("80.00"))

    def test_effective_price_ignores_invalid_discount(self):
        product = _make_product(self.category, price=Decimal("100.00"), discount_price=Decimal("120.00"))
        self.assertEqual(product.effective_price, Decimal("100.00"))

    def test_discount_percentage(self):
        product = _make_product(self.category, price=Decimal("100.00"), discount_price=Decimal("75.00"))
        self.assertEqual(product.discount_percentage, 25)

    def test_category_self_referential_children(self):
        parent = _make_category("Consumer Electronics")
        child = Category.objects.create(name="Laptops", parent=parent)
        self.assertEqual(child.parent, parent)
        self.assertIn(child, parent.children.all())


class ProductImageModelTests(TestCase):
    """Tests for ProductImage's dual uploaded-file / external-URL image source support."""

    def setUp(self):
        self.product = _make_product(_make_category())

    def test_resolved_url_uses_external_url_when_no_file_uploaded(self):
        image = ProductImage.objects.create(product=self.product, external_url="https://example.com/photo.jpg")
        self.assertEqual(image.resolved_url, "https://example.com/photo.jpg")

    def test_clean_requires_at_least_one_image_source(self):
        image = ProductImage(product=self.product)
        with self.assertRaises(ValidationError):
            image.clean()

    def test_clean_passes_with_only_external_url(self):
        image = ProductImage(product=self.product, external_url="https://example.com/photo.jpg")
        image.clean()  # should not raise


class InventoryServiceTests(TestCase):
    def setUp(self):
        self.category = _make_category()
        self.product = _make_product(self.category, stock=10)

    def test_adjust_stock_increases_quantity_and_logs_movement(self):
        InventoryService.adjust_stock(
            product=self.product, quantity_change=5, movement_type=StockMovement.MovementType.RESTOCK
        )
        self.product.inventory.refresh_from_db()
        self.assertEqual(self.product.inventory.quantity, 15)
        self.assertEqual(StockMovement.objects.filter(product=self.product).count(), 1)

    def test_adjust_stock_below_zero_raises(self):
        with self.assertRaises(ApplicationError):
            InventoryService.adjust_stock(
                product=self.product, quantity_change=-100, movement_type=StockMovement.MovementType.SALE
            )

    def test_check_availability_raises_when_insufficient(self):
        with self.assertRaises(ApplicationError):
            InventoryService.check_availability(product=self.product, requested_quantity=1000)

    def test_reserve_and_release_stock(self):
        InventoryService.reserve_stock(product=self.product, quantity=3)
        self.product.inventory.refresh_from_db()
        self.assertEqual(self.product.inventory.reserved_quantity, 3)
        self.assertEqual(self.product.inventory.available_quantity, 7)

        InventoryService.release_stock(product=self.product, quantity=3)
        self.product.inventory.refresh_from_db()
        self.assertEqual(self.product.inventory.reserved_quantity, 0)

    def test_reserve_stock_fails_when_exceeds_available(self):
        with self.assertRaises(ApplicationError):
            InventoryService.reserve_stock(product=self.product, quantity=999)


class ProductServiceTests(TestCase):
    def setUp(self):
        self.category = _make_category()

    def test_related_products_falls_back_to_same_category(self):
        p1 = _make_product(self.category, name="Product A")
        p2 = _make_product(self.category, name="Product B")
        related = ProductService.get_related_products(product=p1)
        self.assertIn(p2, related)

    def test_related_products_prefers_curated(self):
        p1 = _make_product(self.category, name="Product A")
        p2 = _make_product(self.category, name="Product B")
        other_category = _make_category("Books")
        p3 = _make_product(other_category, name="Product C")
        p1.related_products.add(p3)

        related = list(ProductService.get_related_products(product=p1))
        self.assertIn(p3, related)
        self.assertNotIn(p2, related)

    def test_search_products_matches_name(self):
        _make_product(self.category, name="Bluetooth Headphones")
        _make_product(self.category, name="USB Cable")
        results = ProductService.search_products(query="headphones")
        self.assertEqual(results.count(), 1)

    def test_increment_view_count(self):
        product = _make_product(self.category)
        ProductService.increment_view_count(product=product)
        product.refresh_from_db()
        self.assertEqual(product.view_count, 1)

    def test_increment_sold_count(self):
        product = _make_product(self.category)
        ProductService.increment_sold_count(product=product, quantity=3)
        product.refresh_from_db()
        self.assertEqual(product.sold_count, 3)

    def test_set_primary_image_unsets_others(self):
        product = _make_product(self.category)
        img1 = ProductImage.objects.create(product=product, image="test1.jpg", is_primary=True)
        img2 = ProductImage.objects.create(product=product, image="test2.jpg", is_primary=False)

        ProductService.set_primary_image(image=img2)
        img1.refresh_from_db()
        img2.refresh_from_db()
        self.assertFalse(img1.is_primary)
        self.assertTrue(img2.is_primary)


class ProductAPITests(APITestCase):
    def setUp(self):
        self.category = _make_category("Electronics")
        self.brand = Brand.objects.create(name="Acme")
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password="StrongPass1!", first_name="A", last_name="B"
        )
        self.customer = User.objects.create_user(
            email="cust@example.com", password="StrongPass1!", first_name="C", last_name="D"
        )
        self.product = _make_product(
            self.category, name="Gaming Laptop", brand=self.brand, price=Decimal("1500.00"), stock=5
        )

    def test_list_products_public(self):
        response = self.client.get(reverse("products:product-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_search_products(self):
        _make_product(self.category, name="Wireless Keyboard")
        response = self.client.get(reverse("products:product-list-create"), {"search": "Laptop"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Gaming Laptop")

    def test_filter_by_category_slug(self):
        other_category = _make_category("Books")
        _make_product(other_category, name="Novel")
        response = self.client.get(reverse("products:product-list-create"), {"category": self.category.slug})
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_price_range(self):
        _make_product(self.category, name="Cheap Item", price=Decimal("10.00"))
        response = self.client.get(
            reverse("products:product-list-create"), {"min_price": "100", "max_price": "2000"}
        )
        self.assertEqual(response.data["count"], 1)

    def test_ordering_by_price(self):
        _make_product(self.category, name="Budget Mouse", price=Decimal("20.00"))
        response = self.client.get(reverse("products:product-list-create"), {"ordering": "price"})
        prices = [float(item["price"]) for item in response.data["results"]]
        self.assertEqual(prices, sorted(prices))

    def test_pagination_default_page_size(self):
        for i in range(15):
            _make_product(self.category, name=f"Item {i}", sku=f"SKU-EXTRA-{i}")
        response = self.client.get(reverse("products:product-list-create"))
        self.assertEqual(len(response.data["results"]), 12)  # PAGE_SIZE from settings
        self.assertIsNotNone(response.data["next"])

    def test_product_detail_by_slug(self):
        response = self.client.get(reverse("products:product-detail", args=[self.product.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sku"], self.product.sku)

    def test_product_detail_increments_view_count(self):
        self.client.get(reverse("products:product-detail", args=[self.product.slug]))
        self.product.refresh_from_db()
        self.assertEqual(self.product.view_count, 1)

    def test_customer_cannot_create_product(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(
            reverse("products:product-list-create"),
            {"name": "New Item", "category": str(self.category.id), "sku": "NEW-1", "price": "50.00"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_product(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse("products:product-list-create"),
            {"name": "New Item", "category": str(self.category.id), "sku": "NEW-1", "price": "50.00"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Product.objects.filter(sku="NEW-1").exists())
        self.assertTrue(Inventory.objects.filter(product__sku="NEW-1").exists())

    def test_featured_products_endpoint(self):
        _make_product(self.category, name="Featured Item", is_featured=True)
        response = self.client.get(reverse("products:featured"))
        self.assertEqual(response.data["count"], 1)

    def test_best_sellers_endpoint_orders_by_sold_count(self):
        top_seller = _make_product(self.category, name="Top Seller", sold_count=100)
        response = self.client.get(reverse("products:best-sellers"))
        self.assertEqual(response.data["results"][0]["name"], top_seller.name)

    def test_related_products_endpoint(self):
        _make_product(self.category, name="Related Laptop")
        response = self.client.get(reverse("products:product-related", args=[self.product.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_admin_inventory_adjust(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse("products:inventory-adjust", args=[self.product.slug]),
            {"quantity_change": 10, "movement_type": "RESTOCK", "reason": "New shipment"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.inventory.refresh_from_db()
        self.assertEqual(self.product.inventory.quantity, 15)

    def test_customer_cannot_adjust_inventory(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(
            reverse("products:inventory-adjust", args=[self.product.slug]),
            {"quantity_change": 10, "movement_type": "RESTOCK"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
