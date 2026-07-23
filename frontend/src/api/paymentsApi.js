/** Payments API layer — Stripe PaymentIntent creation and status sync. */

import axiosClient from "./axiosClient";

export const paymentsApi = {
  createIntent: (orderId) => axiosClient.post("/payments/create-intent/", { order_id: orderId }).then((res) => res.data),

  syncStatus: (paymentId) => axiosClient.get(`/payments/${paymentId}/sync/`).then((res) => res.data),

  listForOrder: (orderId) => axiosClient.get(`/payments/order/${orderId}/`).then((res) => res.data),
};
