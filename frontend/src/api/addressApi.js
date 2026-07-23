/**
 * Address API layer — one function per backend endpoint.
 * See api/authApi.js for the rationale behind this thin-wrapper pattern.
 */

import axiosClient from "./axiosClient";

export const addressApi = {
  list: () => axiosClient.get("/accounts/addresses/").then((res) => res.data),

  create: (payload) => axiosClient.post("/accounts/addresses/", payload).then((res) => res.data),

  update: (id, payload) =>
    axiosClient.patch(`/accounts/addresses/${id}/`, payload).then((res) => res.data),

  remove: (id) => axiosClient.delete(`/accounts/addresses/${id}/`).then((res) => res.data),

  setDefault: (id) =>
    axiosClient.post(`/accounts/addresses/${id}/set-default/`).then((res) => res.data),
};
