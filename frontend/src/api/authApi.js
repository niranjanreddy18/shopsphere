/**
 * Auth API layer.
 *
 * Design decision: raw Axios calls live here, one function per backend
 * endpoint, returning `response.data` directly. Redux thunks (see
 * features/auth/authSlice.js) call these functions rather than using
 * axiosClient directly — this keeps HTTP/endpoint details out of Redux
 * code entirely, so the API surface can be swapped, mocked, or tested
 * independently of state management.
 */

import axiosClient from "./axiosClient";

export const authApi = {
  register: (payload) => axiosClient.post("/accounts/register/", payload).then((res) => res.data),

  login: (payload) => axiosClient.post("/accounts/login/", payload).then((res) => res.data),

  logout: (refresh) => axiosClient.post("/accounts/logout/", { refresh }).then((res) => res.data),

  fetchProfile: () => axiosClient.get("/accounts/profile/").then((res) => res.data),

  updateProfile: (payload) => axiosClient.patch("/accounts/profile/", payload).then((res) => res.data),

  changePassword: (payload) =>
    axiosClient.post("/accounts/change-password/", payload).then((res) => res.data),

  forgotPassword: (email) =>
    axiosClient.post("/accounts/forgot-password/", { email }).then((res) => res.data),

  resetPassword: (payload) =>
    axiosClient.post("/accounts/reset-password/", payload).then((res) => res.data),

  verifyEmail: (token) =>
    axiosClient.post("/accounts/verify-email/", { token }).then((res) => res.data),
};
