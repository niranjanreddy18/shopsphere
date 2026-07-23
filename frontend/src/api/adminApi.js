/**
 * Admin API layer — every call here hits an admin-only backend endpoint
 * (enforced server-side by IsAdmin/IsAdminOrReadOnly; this file doesn't
 * duplicate that check, it just assumes the caller is already gated by
 * <ProtectedRoute requiredRole="ADMIN" />).
 *
 * Grouped by the resource being managed, one namespace per "Manage X"
 * screen in the Admin Dashboard, rather than one flat function list.
 */

import axiosClient from "./axiosClient";

export const adminProductsApi = {
  list: (params) => axiosClient.get("/products/", { params }).then((res) => res.data),
  create: (payload) => axiosClient.post("/products/", payload).then((res) => res.data),
  update: (slug, payload) => axiosClient.patch(`/products/${slug}/`, payload).then((res) => res.data),
  remove: (slug) => axiosClient.delete(`/products/${slug}/`).then((res) => res.data),
  adjustInventory: (slug, payload) =>
    axiosClient.post(`/products/${slug}/inventory/adjust/`, payload).then((res) => res.data),
  stockMovements: (slug) => axiosClient.get(`/products/${slug}/inventory/movements/`).then((res) => res.data),
};

export const adminCategoriesApi = {
  list: () => axiosClient.get("/products/categories/").then((res) => res.data),
  create: (payload) => axiosClient.post("/products/categories/", payload).then((res) => res.data),
  update: (slug, payload) => axiosClient.patch(`/products/categories/${slug}/`, payload).then((res) => res.data),
  remove: (slug) => axiosClient.delete(`/products/categories/${slug}/`).then((res) => res.data),
};

export const adminBrandsApi = {
  list: () => axiosClient.get("/products/brands/").then((res) => res.data),
  create: (payload) => axiosClient.post("/products/brands/", payload).then((res) => res.data),
  update: (slug, payload) => axiosClient.patch(`/products/brands/${slug}/`, payload).then((res) => res.data),
  remove: (slug) => axiosClient.delete(`/products/brands/${slug}/`).then((res) => res.data),
};

export const adminCouponsApi = {
  list: (params) => axiosClient.get("/coupons/", { params }).then((res) => res.data),
  create: (payload) => axiosClient.post("/coupons/", payload).then((res) => res.data),
  update: (id, payload) => axiosClient.patch(`/coupons/${id}/`, payload).then((res) => res.data),
  remove: (id) => axiosClient.delete(`/coupons/${id}/`).then((res) => res.data),
};

export const adminReviewsApi = {
  list: (params) => axiosClient.get("/reviews/admin/", { params }).then((res) => res.data),
  setApproval: (id, isApproved) =>
    axiosClient.patch(`/reviews/admin/${id}/approval/`, { is_approved: isApproved }).then((res) => res.data),
  remove: (id) => axiosClient.delete(`/reviews/${id}/`).then((res) => res.data),
};

export const adminCustomersApi = {
  list: (params) => axiosClient.get("/accounts/admin/customers/", { params }).then((res) => res.data),
  detail: (id) => axiosClient.get(`/accounts/admin/customers/${id}/`).then((res) => res.data),
  setActive: (id, isActive) =>
    axiosClient.patch(`/accounts/admin/customers/${id}/active/`, { is_active: isActive }).then((res) => res.data),
};
