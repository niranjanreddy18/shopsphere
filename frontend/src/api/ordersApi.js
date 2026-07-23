/**
 * Orders API layer — checkout, order history/detail, cancellation, tracking,
 * invoice download, and the admin order-management endpoints.
 */

import axiosClient from "./axiosClient";

export const ordersApi = {
  checkout: (payload) => axiosClient.post("/orders/checkout/", payload).then((res) => res.data),

  history: (params) => axiosClient.get("/orders/", { params }).then((res) => res.data),

  detail: (id) => axiosClient.get(`/orders/${id}/`).then((res) => res.data),

  tracking: (id) => axiosClient.get(`/orders/${id}/tracking/`).then((res) => res.data),

  cancel: (id, reason) => axiosClient.post(`/orders/${id}/cancel/`, { reason }).then((res) => res.data),

  /** Returns a Blob — the caller is responsible for turning it into a download link. */
  downloadInvoice: (id) => axiosClient.get(`/orders/${id}/invoice/`, { responseType: "blob" }).then((res) => res.data),

  // --- Admin: manage orders ------------------------------------------------
  adminList: (params) => axiosClient.get("/orders/admin/", { params }).then((res) => res.data),

  adminUpdateStatus: (id, payload) =>
    axiosClient.patch(`/orders/admin/${id}/status/`, payload).then((res) => res.data),

  adminSetTracking: (id, payload) =>
    axiosClient.post(`/orders/admin/${id}/tracking/`, payload).then((res) => res.data),
};
