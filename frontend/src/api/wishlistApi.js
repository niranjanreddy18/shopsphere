/** Wishlist API layer — every endpoint here requires an authenticated user. */

import axiosClient from "./axiosClient";

export const wishlistApi = {
  list: () => axiosClient.get("/wishlist/").then((res) => res.data),

  add: (productId) => axiosClient.post("/wishlist/", { product_id: productId }).then((res) => res.data),

  remove: (productId) => axiosClient.delete(`/wishlist/${productId}/`).then((res) => res.data),

  moveToCart: (productId, quantity = 1) =>
    axiosClient.post(`/wishlist/${productId}/move-to-cart/`, { quantity }).then((res) => res.data),
};
