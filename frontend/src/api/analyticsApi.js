/** Analytics API layer — every endpoint here is admin-only on the backend. */

import axiosClient from "./axiosClient";

export const analyticsApi = {
  dashboardStats: () => axiosClient.get("/analytics/dashboard/").then((res) => res.data),

  revenue: (months = 6) => axiosClient.get("/analytics/revenue/", { params: { months } }).then((res) => res.data),

  orderTrends: (days = 30) => axiosClient.get("/analytics/order-trends/", { params: { days } }).then((res) => res.data),

  topProducts: (params) => axiosClient.get("/analytics/top-products/", { params }).then((res) => res.data),

  recentOrders: (limit = 10) => axiosClient.get("/analytics/recent-orders/", { params: { limit } }).then((res) => res.data),
};
