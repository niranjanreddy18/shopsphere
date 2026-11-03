# ShopSphere

ShopSphere is a full-stack e-commerce application built with **Django REST Framework** and **React 19 + Vite + Redux Toolkit + Tailwind CSS**. It implements a complete online retail workflow—from catalog discovery and guest-to-authenticated cart management to atomic checkout, Stripe payments, PDF invoice generation, and an administrative back-office.

---

## Main Features

- **Product Catalog & Discovery**:
  - Hierarchical categories (`parent -> children`), brands, multi-image galleries (`ProductImage` supporting both uploaded media and external URLs), and recently viewed items.
  - Declarative filtering (`django-filter` by category, brand, effective price range, featured status, and live stock availability), full-text search, sorting, and server-side pagination.
- **Shopping Cart & Wishlist**:
  - Seamless **Guest & Authenticated Carts** via a custom `X-Cart-Token` header and automatic guest-to-user cart merging on login/registration.
  - Save-for-later items, live stock availability checks, and server-calculated cart summaries (subtotal, coupon discount, shipping, and tax).
- **Checkout, Orders & Payments**:
  - Transactional order placement with frozen address and line-item price/SKU snapshots (`Order` & `OrderItem`).
  - Explicit state machine for order status transitions (`PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED / CANCELLED / REFUNDED`) with full audit history (`OrderStatusHistory`) and downloadable PDF invoices (`ReportLab`).
  - Stripe PaymentIntent integration with webhook signature verification, idempotent event logging (`WebhookEvent`), and a local dev sync fallback.
- **Reviews & Ratings**:
  - One review per customer per product enforced via database constraints, automatic `is_verified_purchase` detection against delivered orders, and admin moderation.
- **Admin Dashboard**:
  - Role-gated (`ADMIN`) management for products, inventory adjustments & stock movement audit trails, categories, brands, orders, coupons, reviews, customer accounts, and revenue/order analytics charts (`Recharts`).

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.12, Django 4.2, Django REST Framework, SimpleJWT (with token rotation & blacklist), `django-filter`, `drf-spectacular` (OpenAPI 3 / Swagger / Redoc), ReportLab, Stripe SDK |
| **Database** | PostgreSQL (production / Docker) & SQLite (zero-config local development) |
| **Frontend** | React 19, Vite, Redux Toolkit, React Router v7, Tailwind CSS, Axios, Stripe Elements, Recharts, Lucide Icons |
| **Testing** | Django `APITestCase` / `TestCase` (212 backend tests including `assertNumQueries` N+1 checks), Vitest + React Testing Library (99 frontend tests) |

---

## Architecture & Project Structure

```text
├── backend/
│   ├── config/                 # Environment-split settings (base, development, production, testing) & root URLs
│   ├── core/                   # Shared BaseModel (UUID PKs), custom pagination, permissions, and exception envelope
│   └── apps/
│       ├── accounts/           # Custom email-based User model, JWT auth, Addresses, seed_data command
│       ├── products/           # Category, Brand, Product, ProductImage, Inventory, StockMovement
│       ├── cart/               # Cart & CartItem (user XOR cart_token), ShippingService, TaxService
│       ├── orders/             # Order, OrderItem, OrderStatusHistory, Checkout & PDF InvoiceService
│       ├── payments/           # Payment & WebhookEvent (Stripe PaymentIntents + idempotent webhooks)
│       ├── coupons/            # Coupon & CouponUsage validation and atomic redemption tracking
│       ├── reviews/            # Product reviews, verified-purchase check, and moderation
│       ├── wishlist/           # Authenticated user wishlist & move-to-cart workflow
│       ├── notifications/      # In-app order lifecycle notifications
│       └── analytics/          # Admin KPI aggregations, monthly revenue, and top-selling products
└── frontend/
    └── src/
        ├── api/                # Centralized axiosClient (silent JWT refresh queue + X-Cart-Token header)
        ├── app/store/          # Redux Toolkit store configuration
        ├── components/         # Shared UI primitives (Button, Modal, Skeleton, StarRating) & layout chrome
        ├── features/           # Feature-sliced modules (auth, products, cart, wishlist, orders, notifications, admin)
        ├── hooks/              # Custom hooks (useAuth, useDebounce)
        ├── layouts/            # MainLayout, AuthLayout, ProfileLayout
        └── routes/             # AppRoutes with React.lazy() route-level code splitting
```

---

## Key Engineering Decisions

### 1. Service Layer & Database Transactions
Views and serializers handle HTTP parsing and validation only; domain mutations live in `services.py`. Critical multi-step operations (`OrderService.create_order_from_cart`, `OrderService.cancel_order`, `InventoryService.deduct_stock` / `restock`) run inside `@transaction.atomic` blocks and acquire row-level locks on `Inventory` records via `select_for_update()` to prevent race conditions and overselling under concurrent checkouts.Every stock change writes an immutable `StockMovement` audit row.

### 2. Database Design & N+1 Query Prevention
- **Historical Snapshots**: `Order` copies shipping/billing address fields and `OrderItem` snapshots `product_name`, `product_sku`, and `unit_price` at purchase time so subsequent catalog edits or address changes never corrupt historical order records or revenue analytics.
- **Database Constraints**: `Cart` enforces `user IS NOT NULL XOR cart_token IS NOT NULL` via a SQL `CheckConstraint`. `Review`, `CartItem`, and `WishlistItem` enforce uniqueness via composite `UniqueConstraint`s.
- **Query Optimization**: `PRODUCT_LIST_QUERYSET` uses `select_related("category", "brand", "inventory")`, `prefetch_related("images")`, and SQL `Avg` / `Count` annotations for review ratings so rendering a paginated product grid executes a constant number of queries (`assertNumQueries(3)`). `OrderDetailView` prefetches `items__product__images` and `status_history__changed_by` in 4 constant queries.

### 3. Predictable Error Envelope & Silent JWT Refresh
- **Backend Error Normalization**: `core/exceptions.py` normalizes all `ApplicationError`, Django `ValidationError`, and DRF `APIException` responses into a single JSON shape:
  ```json
  {
    "success": false,
    "message": "Human-readable summary",
    "errors": { "field": ["detail"] }
  }
  ```
- **Frontend Interceptor Queue**: `axiosClient.js` intercepts `401 Unauthorized` responses, performs a single `/api/v1/accounts/token/refresh/` call, and queues any concurrent in-flight requests so they replay automatically once the new access token arrives.

### 4. State Management & Admin Dashboard Architecture
- **Global vs. Local State**: Shared cross-page state (`auth`, `cart`, `wishlist`, `products`, `orders`, `notifications`, `address`) lives in Redux Toolkit slices and resets cleanly on logout. Single-screen back-office tables (`AdminProductsPage`, `AdminOrdersPage`, etc.) intentionally use local component state so admin-only CRUD state does not bloat the global store.
- **Performance & Caching**: Curated public collection endpoints (`featured`, `new-arrivals`, `best-sellers`) use a 10-minute TTL cache (`cache_page`). On the frontend, heavy routes (Catalog filters, Checkout/Stripe Elements, Admin Recharts dashboards) are split via `React.lazy()`, and below-the-fold product/category images use native `loading="lazy"` and `decoding="async"`.

---

## Local Setup & Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

The `seed_data` command populates categories, brands, products with images and inventory, sample coupons (`WELCOME10`, `SAVE20`, `FLAT50`), orders, and demo accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@shopsphere.com` | `AdminPass123!` |
| **Customer** | `customer@shopsphere.com` | `CustomerPass123!` |

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

- **Storefront**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5173/admin (sign in with the Admin account above)
- **Swagger UI**: http://localhost:8000/api/docs/
- **Redoc**: http://localhost:8000/api/redoc/

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default (Local Dev) |
| :--- | :--- | :--- |
| `DJANGO_SETTINGS_MODULE` | Settings module path | `config.settings.development` |
| `DJANGO_SECRET_KEY` | Django cryptographic signing key | Insecure dev key fallback |
| `DEBUG` | Debug mode (`True` / `False`) | `True` |
| `ALLOWED_HOSTS` | Comma-separated hostnames | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins | `http://localhost:5173,http://127.0.0.1:5173` |
| `USE_SQLITE` | Use SQLite instead of PostgreSQL in dev | `True` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection settings (when `USE_SQLITE=False`) | `ecommerce_db`, `postgres`, `localhost`, `5432` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe API & webhook keys (optional for browsing/cart/checkout) | Empty |

### Frontend (`frontend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL for backend API requests | `http://localhost:8000/api/v1` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for `PaymentPage` | `pk_test_...` |

---

## Running Tests

```bash
# Backend test suite (212 tests)
cd backend
python manage.py test --settings=config.settings.testing

# Frontend test suite (99 tests)
cd frontend
npm test -- --run
```

---

## License

This project is licensed under the MIT License.
