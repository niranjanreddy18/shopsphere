/**
 * Products API layer.
 *
 * `list()` forwards an arbitrary params object straight to Axios, which
 * serialises it as a query string — this keeps the API layer generic and
 * lets productSlice own the specific set of filter/sort/page params
 * without this file needing to know about each one individually.
 */

import axiosClient from "./axiosClient";

export const productsApi = {
  list: (params) => axiosClient.get("/products/", { params }).then((res) => res.data),

  detail: (slug) => axiosClient.get(`/products/${slug}/`).then((res) => res.data),

  related: (slug) => axiosClient.get(`/products/${slug}/related/`).then((res) => res.data),

  featured: (params) => axiosClient.get("/products/featured/", { params }).then((res) => res.data),

  newArrivals: (params) => axiosClient.get("/products/new-arrivals/", { params }).then((res) => res.data),

  bestSellers: (params) => axiosClient.get("/products/best-sellers/", { params }).then((res) => res.data),

  categories: () => axiosClient.get("/products/categories/").then((res) => res.data),

  brands: () => axiosClient.get("/products/brands/").then((res) => res.data),
};
