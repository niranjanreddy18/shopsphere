/**
 * Centralised Axios client.
 *
 * Design decisions:
 *  - A single configured instance (not the global `axios` object) is
 *    exported and imported everywhere else in the app. This means base URL,
 *    headers, and interceptor behaviour are defined exactly once.
 *  - Request interceptor attaches the current access token (if any) to
 *    every outgoing request.
 *  - Response interceptor implements silent access-token refresh: on a 401
 *    caused by an expired access token, it transparently calls the refresh
 *    endpoint, retries the original request once with the new token, and
 *    only forces a logout if the refresh itself fails (refresh token
 *    expired/invalid). This means a user's session survives the 15-minute
 *    access-token expiry without them noticing.
 *  - Concurrent 401s while a refresh is already in-flight are queued rather
 *    than each independently calling /token/refresh/, which would race and
 *    potentially invalidate each other's rotated refresh tokens.
 */

import axios from "axios";
import toast from "react-hot-toast";

import { getAccessToken, getRefreshToken, setTokens, clearTokens, isPersistentSession } from "../utils/tokenStorage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// --- Request interceptor: attach access token -----------------------------
axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response interceptor: silent refresh on 401 ---------------------------
let isRefreshing = false;
let pendingQueue = []; // requests waiting on an in-flight refresh

/**
 * Resolves or rejects every queued request once the in-flight refresh
 * finishes, so they don't each trigger their own duplicate refresh call.
 */
function flushQueue(error, newAccessToken = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newAccessToken);
  });
  pendingQueue = [];
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Never attempt to refresh for the auth endpoints themselves — that
    // would create an infinite loop if the refresh token itself is invalid.
    const isAuthEndpoint =
      originalRequest?.url?.includes("/accounts/login") ||
      originalRequest?.url?.includes("/accounts/token/refresh");

    if (status !== 401 || isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // A refresh is already happening — wait for it instead of firing a
      // second one, then retry this request with whatever token results.
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newAccessToken) => {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const { data } = await axios.post(`${BASE_URL}/accounts/token/refresh/`, {
        refresh: refreshToken,
      });
      setTokens({ access: data.access, refresh: data.refresh ?? refreshToken }, isPersistentSession());
      flushQueue(null, data.access);
      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError);
      clearTokens();
      // Only announce this on an actual expired-session redirect (a
      // refresh attempt that failed), not on the "no refresh token at
      // all" branch above — that one just means the visitor was never
      // logged in, which needs no explanation.
      toast.error("Your session has expired. Please log in again.");
      // A full redirect (rather than a router push) guarantees all in-memory
      // Redux state is wiped along with the invalid session.
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosClient;
