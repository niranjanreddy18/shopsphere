/**
 * Centralised route path constants.
 *
 * Using named constants instead of hard-coded strings scattered across
 * <Link>/<Route>/navigate() calls means renaming a route is a one-line
 * change here instead of a project-wide find-and-replace.
 */

export const ROUTES = {
  HOME: "/",
  PRODUCTS: "/products",
  COLLECTIONS: "/collections",
  PRODUCT_DETAIL: "/products/:slug",
  CATEGORY: "/categories/:slug",
  SEARCH: "/search",
  CART: "/cart",
  WISHLIST: "/wishlist",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
  PROFILE: "/profile",
  ADDRESSES: "/profile/addresses",
  CHANGE_PASSWORD: "/profile/change-password",
  ADMIN_DASHBOARD: "/admin",
};
