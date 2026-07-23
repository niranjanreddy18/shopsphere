/**
 * Cart API layer.
 *
 * Every call attaches the current guest cart token (if any) via the
 * `X-Cart-Token` header, and — because the backend only ever mints a new
 * token for a request that didn't already carry one — persists whatever
 * token comes back on the response. This means cartSlice's thunks never
 * need to think about the token at all; it's fully handled at this layer.
 * Once a user logs in, `getAccessToken()` being present means axiosClient's
 * own interceptor attaches the JWT instead, and the backend prioritises the
 * authenticated user over any guest token (see CartViewMixin.resolve_cart).
 */

import axiosClient from "./axiosClient";
import { getCartToken, setCartToken } from "../utils/cartToken";

function withCartTokenHeader(config = {}) {
  const token = getCartToken();
  return {
    ...config,
    headers: { ...(config.headers || {}), ...(token ? { "X-Cart-Token": token } : {}) },
  };
}

/** Persists a freshly-minted guest cart token from the response, if present. */
function captureCartToken(response) {
  const newToken = response.headers?.["x-cart-token"];
  if (newToken) setCartToken(newToken);
  return response.data;
}

export const cartApi = {
  getCart: (couponCode) =>
    axiosClient
      .get("/cart/", withCartTokenHeader({ params: couponCode ? { coupon_code: couponCode } : {} }))
      .then(captureCartToken),

  addItem: (productId, quantity = 1) =>
    axiosClient
      .post("/cart/items/", { product_id: productId, quantity }, withCartTokenHeader())
      .then(captureCartToken),

  updateQuantity: (itemId, quantity) =>
    axiosClient.patch(`/cart/items/${itemId}/`, { quantity }, withCartTokenHeader()).then(captureCartToken),

  removeItem: (itemId) =>
    axiosClient.delete(`/cart/items/${itemId}/`, withCartTokenHeader()).then(captureCartToken),

  saveForLater: (itemId) =>
    axiosClient.post(`/cart/items/${itemId}/save-for-later/`, {}, withCartTokenHeader()).then(captureCartToken),

  moveToCart: (itemId) =>
    axiosClient.post(`/cart/items/${itemId}/move-to-cart/`, {}, withCartTokenHeader()).then(captureCartToken),

  /** Called once, right after login/registration, to fold a guest cart into the user's persistent cart. */
  mergeGuestCart: (cartToken) =>
    axiosClient.post("/cart/merge/", { cart_token: cartToken }).then((res) => res.data),
};
