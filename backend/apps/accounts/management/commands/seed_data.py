"""
Management command: seed_data.

Populates the database with a realistic, demo-ready catalog: 15 categories,
20 brands, ~100 products (each with 3 real product photos, description,
pricing, and stock), ~100 customer reviews, several coupons, a dozen sample
customers, and a spread of orders across every status in the lifecycle —
enough data for every screen in the app (home page collections, filters,
admin dashboard/analytics charts, order history) to look like a live store
rather than an empty shell.

Idempotent by design (`get_or_create` / SKU-existence checks throughout),
so re-running it (e.g. on every `docker-compose up`) never duplicates data.

Usage:
    python manage.py seed_data
    python manage.py seed_data --flush   # wipe seedable tables first
"""

import random
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Address, User
from apps.cart.models import Cart, CartItem
from apps.coupons.models import Coupon
from apps.orders.models import Order
from apps.orders.services import OrderService
from apps.products.models import Brand, Category, Inventory, Product, ProductImage
from apps.products.seed.catalog import get_catalog
from apps.reviews.models import Review

# =============================================================================
# Reference data
# =============================================================================

CATALOG = get_catalog()
CATEGORY_NAMES = CATALOG["categories"]
BRAND_NAMES = CATALOG["brands"]
PRODUCT_SEEDS = CATALOG["products"]
IMAGE_ROOT = CATALOG["image_root"]
CATEGORY_IMAGE_ROOT = Path(settings.BASE_DIR) / "media" / "categories"

ADJECTIVES = [
    "Pro", "Elite", "Ultra", "Max", "Air", "Lite", "Plus", "Prime", "Studio",
    "Essential", "Signature", "Classic", "Core", "Edge", "Flex",
] 

REVIEW_COMMENTS = [
    ("Exceeded my expectations, would buy again.", 5),
    ("Great value for the price.", 5),
    ("Does exactly what it says, no complaints.", 4),
    ("Solid build quality, arrived quickly.", 5),
    ("Good but the battery life could be better.", 3),
    ("Works well, though setup took longer than expected.", 3),
    ("Fantastic product, highly recommend!", 5),
    ("Decent for the price, not premium but functional.", 3),
    ("Had an issue but support resolved it quickly.", 4),
    ("Not what I expected, a bit underwhelming.", 2),
    ("Perfect for daily use, very satisfied.", 5),
    ("Good quality, matches the description.", 4),
    ("Stopped working after a few weeks.", 2),
    ("Best purchase I've made this year.", 5),
    ("Average product, does the job.", 3),
]

FIRST_NAMES = ["Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Lucas"]
LAST_NAMES = ["Bennett", "Carter", "Diaz", "Foster", "Grant", "Hayes", "Iverson", "Jenkins", "Kelly", "Lawson"]

US_CITIES = [
    ("Springfield", "IL", "62704"), ("Austin", "TX", "73301"), ("Denver", "CO", "80202"),
    ("Seattle", "WA", "98101"), ("Boston", "MA", "02108"), ("Miami", "FL", "33101"),
]


class Command(BaseCommand):
    help = "Seeds the database with a full demo catalog: categories, brands, products, reviews, coupons, users, and orders."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush", action="store_true",
            help="Delete existing seedable data (orders/reviews/products/categories/brands/coupons/demo users) first.",
        )
        parser.add_argument("--products", type=int, default=105, help="Approximate number of products to create.")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        self._seed_admin()
        customers = self._seed_customers()
        categories = self._seed_categories()
        brands = self._seed_brands()
        products = self._seed_products(categories, brands, target_count=options["products"])
        self._seed_reviews(products, customers)
        self._seed_coupons()
        self._seed_orders(products, customers)

        self.stdout.write(self.style.SUCCESS("\nSeed data created successfully."))
        self.stdout.write(self.style.SUCCESS(f"  Categories: {Category.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  Brands: {Brand.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  Products: {Product.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  Product images: {ProductImage.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  Reviews: {Review.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  Coupons: {Coupon.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  Customers: {User.objects.filter(role='CUSTOMER').count()}"))
        self.stdout.write(self.style.SUCCESS(f"  Orders: {Order.objects.count()}"))

    # -------------------------------------------------------------------
    def _flush(self):
        self.stdout.write("Flushing existing seedable data...")
        Order.objects.all().delete()
        Review.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        Brand.objects.all().delete()
        Coupon.objects.all().delete()
        User.objects.filter(email__endswith="@shopsphere.com").exclude(email="admin@shopsphere.com").delete()

    # -------------------------------------------------------------------
    def _seed_admin(self):
        if not User.objects.filter(email="admin@shopsphere.com").exists():
            User.objects.create_superuser(
                email="admin@shopsphere.com", password="AdminPass123!", first_name="Admin", last_name="User"
            )
            self.stdout.write(self.style.SUCCESS("Created admin user: admin@shopsphere.com / AdminPass123!"))

    def _seed_customers(self) -> list:
        customers = []

        primary, created = User.objects.get_or_create(
            email="customer@shopsphere.com",
            defaults=dict(first_name="Sam", last_name="Shopper", is_email_verified=True),
        )
        if created:
            primary.set_password("CustomerPass123!")
            primary.save()
            self.stdout.write(self.style.SUCCESS("Created sample customer: customer@shopsphere.com / CustomerPass123!"))
        customers.append(primary)

        for i, (first, last) in enumerate(zip(FIRST_NAMES, LAST_NAMES)):
            email = f"{first.lower()}.{last.lower()}@shopsphere.com"
            user, created = User.objects.get_or_create(
                email=email, defaults=dict(first_name=first, last_name=last, is_email_verified=True)
            )
            if created:
                user.set_password("DemoPass123!")
                user.save()
            customers.append(user)

            if not Address.objects.filter(user=user).exists():
                city, state, postal = US_CITIES[i % len(US_CITIES)]
                Address.objects.create(
                    user=user, full_name=f"{first} {last}", phone_number="+15555550100",
                    line1=f"{100 + i} Market Street", city=city, state=state, postal_code=postal,
                    country="USA", is_default=True,
                )

        self.stdout.write(self.style.SUCCESS(f"Ensured {len(customers)} customer accounts."))
        return customers

    def _find_category_image(self, name: str, slug: str) -> str | None:
        exact_paths = [
            CATEGORY_IMAGE_ROOT / f"{name}.jpg",
            CATEGORY_IMAGE_ROOT / f"{slug}.jpg",
        ]
        for path in exact_paths:
            if path.exists():
                return f"categories/{path.name}"

        for path in CATEGORY_IMAGE_ROOT.iterdir():
            if path.is_file() and path.suffix.lower() == ".jpg":
                if path.stem.lower() in {name.lower(), slug.lower()}:
                    return f"categories/{path.name}"
        return None

    def _seed_categories(self) -> dict:
        categories = {}

        for name in CATEGORY_NAMES:
            slug = name.lower().replace(" & ", "-").replace("'", "").replace(" ", "-")
            image_file = self._find_category_image(name, slug)

            category, created = Category.objects.get_or_create(
                name=name,
                defaults={
                    "slug": slug,
                    "description": f"{name} collection",
                    "image": image_file,
                },
            )

            if image_file and (created or not category.image):
                category.image = image_file
                category.save(update_fields=["image"])

            categories[name] = category

        self.stdout.write(self.style.SUCCESS(f"Ensured {len(categories)} categories."))
        return categories

    def _seed_brands(self) -> dict:
        brands = {}
        brand_logo_dir = Path(settings.BASE_DIR) / "frontend" / "public" / "images" / "brands"
        for name in BRAND_NAMES:
            slug = slugify(name)
            brand, created = Brand.objects.get_or_create(
                name=name,
                defaults={
                    "slug": slug,
                    "description": f"{name} brand",
                },
            )

            if created or not brand.logo:
                logo_path = self._find_brand_logo(name, slug, brand_logo_dir)
                if logo_path:
                    brand.logo = logo_path
                    brand.save(update_fields=["logo"])

            brands[name] = brand
        self.stdout.write(self.style.SUCCESS(f"Ensured {len(brands)} brands."))
        return brands

    def _find_brand_logo(self, name: str, slug: str, logo_dir: Path):
        if not logo_dir.exists():
            return None

        candidate_names = {
            name.lower().replace(" & ", " ").replace("'", "").replace(".", "").replace(" ", "-"):
                None,
            slug.lower(): None,
        }

        for path in logo_dir.iterdir():
            if not path.is_file():
                continue
            base = path.stem.lower().replace(" & ", " ").replace("'", "").replace(".", "").replace(" ", "-")
            if base in candidate_names:
                return path
        return None

    def _seed_products(self, categories: dict, brands: dict, *, target_count: int) -> list:
        """Create products from the static catalog module.

        The existing inventory/review/order sizing logic is preserved; only the
        catalog source and image attachment behavior are changed.
        """
        products = list(Product.objects.select_related("category", "brand"))
        existing_skus = {p.sku for p in products}

        created_count = 0
        for index, product_seed in enumerate(PRODUCT_SEEDS, start=1):
            category = categories[product_seed.category]
            brand = brands[product_seed.brand]
            sku = f"SKU-{index:03d}"
            if sku in existing_skus:
                continue

            base_price = product_seed.price
            discount_price = None
            if base_price >= Decimal("100"):
                discount_price = (base_price * Decimal("0.9")).quantize(Decimal("0.01"))

            product = Product.objects.create(
                name=product_seed.name,
                category=category,
                brand=brand,
                sku=sku,
                price=base_price,
                discount_price=discount_price,
                is_featured=index % 5 == 0,
                short_description=product_seed.short_description,
                description=product_seed.description,
            )

            stock = random.choice([12, 18, 25, 40, 65, 110])
            Inventory.objects.create(
                product=product,
                quantity=stock,
                low_stock_threshold=10 if stock else 0,
            )

            for image_index, relative_path in enumerate(product_seed.image_paths):
                ProductImage.objects.create(
                    product=product,
                    image=str(IMAGE_ROOT / relative_path),
                    alt_text=product_seed.name,
                    is_primary=(image_index == 0),
                    display_order=image_index,
                )

            products.append(product)
            existing_skus.add(sku)
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created_count} new product(s) (total: {len(products)})."))
        return products

    def _seed_reviews(self, products: list, customers: list, *, target_count: int = 100):
        if not products:
            return

        existing_count = Review.objects.count()
        remaining = target_count - existing_count
        if remaining <= 0:
            self.stdout.write(f"Reviews already at target ({existing_count}); skipping.")
            return

        created_count = 0
        attempts = 0
        # Cap attempts, not just successes — unique_together(product, user)
        # means random pairs can collide; bail out cleanly rather than loop
        # forever once the product/customer pool is close to exhausted.
        while created_count < remaining and attempts < remaining * 4:
            attempts += 1
            product = random.choice(products)
            customer = random.choice(customers)
            comment, rating = random.choice(REVIEW_COMMENTS)

            if Review.objects.filter(product=product, user=customer).exists():
                continue

            Review.objects.create(product=product, user=customer, rating=rating, comment=comment)
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created_count} new review(s) (total: {existing_count + created_count})."))

    def _seed_coupons(self):
        now = timezone.now()
        coupons = [
            dict(code="WELCOME10", discount_type=Coupon.DiscountType.PERCENTAGE, discount_value=Decimal("10"),
                 max_discount_amount=Decimal("50"), min_order_amount=Decimal("25")),
            dict(code="FLAT20", discount_type=Coupon.DiscountType.FIXED, discount_value=Decimal("20"),
                 min_order_amount=Decimal("100")),
            dict(code="SUMMER25", discount_type=Coupon.DiscountType.PERCENTAGE, discount_value=Decimal("25"),
                 max_discount_amount=Decimal("75"), min_order_amount=Decimal("50")),
            dict(code="VIP15", discount_type=Coupon.DiscountType.PERCENTAGE, discount_value=Decimal("15"),
                 max_discount_amount=Decimal("100"), min_order_amount=Decimal("0"), usage_limit_per_user=5),
            dict(code="FREESHIP", discount_type=Coupon.DiscountType.FIXED, discount_value=Decimal("10"),
                 min_order_amount=Decimal("30")),
        ]

        created_count = 0
        for kwargs in coupons:
            if Coupon.objects.filter(code=kwargs["code"]).exists():
                continue
            Coupon.objects.create(valid_from=now - timedelta(days=1), valid_until=now + timedelta(days=180), **kwargs)
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created_count} new coupon(s)."))

    def _seed_orders(self, products: list, customers: list, *, target_count: int = 18):
        # Orders are historical demo transactions, not canonical catalog
        # data — "skip if any already exist" is a simpler, sufficient
        # idempotency guarantee here than trying to reconcile a partial
        # count against `target_count` on every re-run.
        if Order.objects.exists():
            self.stdout.write(f"{Order.objects.count()} order(s) already present; skipping order seeding.")
            return

        in_stock_products = [p for p in products if getattr(p, "inventory", None) and p.inventory.quantity > 0]
        if not in_stock_products:
            self.stdout.write("Skipping order seeding (no in-stock products).")
            return

        status_plan = (
            [Order.Status.PENDING] * 3
            + [Order.Status.CONFIRMED] * 3
            + [Order.Status.PROCESSING] * 3
            + [Order.Status.SHIPPED] * 3
            + [Order.Status.DELIVERED] * 4
            + [Order.Status.CANCELLED] * 2
        )

        created_count = 0
        for target_status in status_plan:
            customer = random.choice([c for c in customers if c.email != "admin@shopsphere.com"])
            address = Address.objects.filter(user=customer).first()
            if not address:
                continue
            
            cart, _ = Cart.objects.get_or_create(user=customer)
            cart.items.all().delete()  # start from a clean cart for each seeded order

            for product in random.sample(in_stock_products, k=min(random.randint(1, 3), len(in_stock_products))):
                available = product.inventory.available_quantity
                if available < 1:
                    continue
                CartItem.objects.create(cart=cart, product=product, quantity=min(random.randint(1, 2), available))
            
            if not cart.items.exists():
                continue

            try:
                order = OrderService.create_order_from_cart(
                    user=customer, shipping_address_id=address.id, billing_address_id=address.id
                )
            except Exception:
                continue

            self._advance_order_to_status(order, target_status, customer)

            # Spread orders across the last 60 days so analytics charts
            # (monthly revenue, order trends) have more than a single
            # today's-date spike to render.
            backdated = timezone.now() - timedelta(days=random.randint(0, 60))
            Order.objects.filter(pk=order.pk).update(created_at=backdated)
            order.status_history.update(created_at=backdated)

            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created_count} new order(s) across the full status lifecycle."))

    @staticmethod
    def _advance_order_to_status(order: Order, target_status: str, actor):
        """Walks an order through OrderService transitions until it reaches target_status."""
        if target_status == Order.Status.CANCELLED:
            OrderService.cancel_order(order=order, cancelled_by=actor, reason="Changed my mind.")
            return

        path = [Order.Status.CONFIRMED, Order.Status.PROCESSING, Order.Status.SHIPPED, Order.Status.DELIVERED]
        for status in path:
            if order.status == target_status:
                return
            order = OrderService.update_status(order=order, new_status=status, changed_by=None)
