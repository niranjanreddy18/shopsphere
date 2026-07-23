/**
 * Guest cart token storage.
 *
 * The backend identifies a guest (not-logged-in) cart via an opaque
 * `cart_token` UUID, sent as the `X-Cart-Token` request header and echoed
 * back in the response header the first time one is minted (see
 * apps/cart/views.py::CartViewMixin on the backend). We deliberately avoid
 * relying on Django's session cookie for this — cookies bring
 * SameSite/CORS credential complications for a decoupled SPA — so this
 * token is just another piece of client state, stored the same way JWTs
 * are (see utils/tokenStorage.js).
 */

const CART_TOKEN_KEY = "ecommerce_cart_token";

export function getCartToken() {
  return localStorage.getItem(CART_TOKEN_KEY);
}

export function setCartToken(token) {
  if (token) localStorage.setItem(CART_TOKEN_KEY, token);
}

export function clearCartToken() {
  localStorage.removeItem(CART_TOKEN_KEY);
}
