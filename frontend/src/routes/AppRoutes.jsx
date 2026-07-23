/**
 * AppRoutes — the single source of truth for the app's route tree.
 *
 * Performance note (lazy loading): every page component below the fold of
 * initial interest — the product catalog, cart, wishlist, checkout/order,
 * and admin pages, which pull in the heaviest per-page code (filters,
 * galleries, forms, Stripe Elements, Recharts) — is loaded via
 * React.lazy() rather than a static import. This splits the production
 * bundle so a first-time visitor's initial JS payload only includes the
 * auth pages and shell; every other chunk is fetched on demand, the
 * moment the user actually navigates there. This matters most for the
 * admin bundle (Recharts is a meaningfully large dependency) and the
 * payment bundle (Stripe.js) — neither should cost a regular shopper
 * anything on their very first page load.
 *
 * Structure:
 *   MainLayout (header/footer shell)
 *     ├─ "/"                          HomePage
 *     ├─ /products, /products/:slug, /categories/:slug, /search, /cart  (public)
 *     ├─ PublicOnlyRoute → AuthLayout  /login /register /forgot-password /reset-password
 *     ├─ /verify-email                (public — token-based)
 *     └─ ProtectedRoute (any authenticated user)
 *          ├─ /wishlist
 *          ├─ /checkout, /orders, /orders/:id, /orders/:id/pay, /orders/:id/success
 *          ├─ ProfileLayout           /profile /profile/addresses /profile/change-password
 *          └─ ProtectedRoute requiredRole="ADMIN" → AdminLayout
 *               /admin, /admin/analytics, /admin/products, /admin/categories,
 *               /admin/brands, /admin/orders, /admin/coupons, /admin/reviews, /admin/customers
 */

import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import ProfileLayout from "../layouts/ProfileLayout";

import ProtectedRoute from "../components/common/ProtectedRoute";
import PublicOnlyRoute from "../components/common/PublicOnlyRoute";
import { FullPageSpinner } from "../components/ui/Spinner";

import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";
import StaticInfoPage from "../pages/StaticInfoPage";
import { STATIC_PAGES } from "../pages/staticPageContent";

import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";
import VerifyEmailPage from "../features/auth/pages/VerifyEmailPage";
import ProfilePage from "../features/auth/pages/ProfilePage";
import AddressesPage from "../features/auth/pages/AddressesPage";
import ChangePasswordPage from "../features/auth/pages/ChangePasswordPage";

import { ROUTES } from "../constants/routes";

// --- Lazily-loaded, code-split page bundles -------------------------------
const ProductListingPage = lazy(() => import("../features/products/pages/ProductListingPage"));
const ProductDetailsPage = lazy(() => import("../features/products/pages/ProductDetailsPage"));
const CategoryPage = lazy(() => import("../features/products/pages/CategoryPage"));
const SearchPage = lazy(() => import("../features/products/pages/SearchPage"));
const CartPage = lazy(() => import("../features/cart/pages/CartPage"));
const WishlistPage = lazy(() => import("../features/wishlist/pages/WishlistPage"));

const CheckoutPage = lazy(() => import("../features/orders/pages/CheckoutPage"));
const PaymentPage = lazy(() => import("../features/orders/pages/PaymentPage"));
const OrderSuccessPage = lazy(() => import("../features/orders/pages/OrderSuccessPage"));
const OrderHistoryPage = lazy(() => import("../features/orders/pages/OrderHistoryPage"));
const OrderDetailPage = lazy(() => import("../features/orders/pages/OrderDetailPage"));

const AdminLayout = lazy(() => import("../features/admin/layouts/AdminLayout"));
const AdminDashboardPage = lazy(() => import("../features/admin/pages/AdminDashboardPage"));
const AnalyticsDashboardPage = lazy(() => import("../features/admin/pages/AnalyticsDashboardPage"));
const AdminProductsPage = lazy(() => import("../features/admin/pages/AdminProductsPage"));
const AdminCategoriesPage = lazy(() => import("../features/admin/pages/AdminCategoriesPage"));
const AdminBrandsPage = lazy(() => import("../features/admin/pages/AdminBrandsPage"));
const AdminOrdersPage = lazy(() => import("../features/admin/pages/AdminOrdersPage"));
const AdminCouponsPage = lazy(() => import("../features/admin/pages/AdminCouponsPage"));
const AdminReviewsPage = lazy(() => import("../features/admin/pages/AdminReviewsPage"));
const AdminCustomersPage = lazy(() => import("../features/admin/pages/AdminCustomersPage"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME} element={<HomePage />} />

          {/* --- Footer info/legal pages (public, static content) ----------- */}
          {Object.entries(STATIC_PAGES).map(([slug, content]) => (
            <Route key={slug} path={`/${slug}`} element={<StaticInfoPage {...content} />} />
          ))}

          {/* --- Public catalog & cart — no auth required ------------------ */}
          <Route path="/collections" element={<Navigate to={ROUTES.PRODUCTS} replace />} />
          <Route path="/products" element={<ProductListingPage />} />
          <Route path="/products/:slug" element={<ProductDetailsPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />

          {/* --- Public-only auth pages (centred card layout) --------------- */}
          <Route element={<PublicOnlyRoute />}>
            <Route element={<AuthLayout />}>
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
              <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
            </Route>
          </Route>

          {/* --- Email verification: accessible whether logged in or not ---- */}
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
          </Route>

          {/* --- Authenticated-only pages ------------------------------------ */}
          <Route element={<ProtectedRoute />}>
            <Route path="/wishlist" element={<WishlistPage />} />

            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrderHistoryPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/orders/:id/pay" element={<PaymentPage />} />
            <Route path="/orders/:id/success" element={<OrderSuccessPage />} />

            <Route element={<ProfileLayout />}>
              <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
              <Route path={ROUTES.ADDRESSES} element={<AddressesPage />} />
              <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePasswordPage />} />
            </Route>

            {/* --- Admin-only pages ------------------------------------------- */}
            <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
                <Route path="/admin/products" element={<AdminProductsPage />} />
                <Route path="/admin/categories" element={<AdminCategoriesPage />} />
                <Route path="/admin/brands" element={<AdminBrandsPage />} />
                <Route path="/admin/orders" element={<AdminOrdersPage />} />
                <Route path="/admin/coupons" element={<AdminCouponsPage />} />
                <Route path="/admin/reviews" element={<AdminReviewsPage />} />
                <Route path="/admin/customers" element={<AdminCustomersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
