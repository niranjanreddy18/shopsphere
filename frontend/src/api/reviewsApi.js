/**
 * Reviews API layer.
 *
 * The reviews app (apps.reviews) has existed on the backend since an
 * earlier prompt, but had no frontend integration yet — this is that
 * integration: fetching a product's reviews, submitting a new one, and
 * the homepage testimonials showcase.
 */

import axiosClient from "./axiosClient";

export const reviewsApi = {
  listForProduct: (productId) => axiosClient.get(`/reviews/product/${productId}/`).then((res) => res.data),

  create: (productId, rating, comment) =>
    axiosClient.post("/reviews/", { product_id: productId, rating, comment }).then((res) => res.data),

  remove: (reviewId) => axiosClient.delete(`/reviews/${reviewId}/`).then((res) => res.data),

  testimonials: () => axiosClient.get("/reviews/testimonials/").then((res) => res.data),
};
