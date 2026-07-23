/**
 * Token storage helper.
 *
 * All access to persisted JWTs goes through this module instead of every
 * feature touching localStorage/sessionStorage directly. Trade-off note:
 * Web Storage is used (over httpOnly cookies) because this is a decoupled
 * SPA + API project with no server-rendered component to set cookies
 * from; the accepted trade-off is that tokens are readable by JS (XSS
 * risk) whereas httpOnly cookies would not be. In a browser-hardened
 * production app you'd typically move refresh-token storage to an
 * httpOnly cookie issued by the backend and keep only the short-lived
 * access token in memory.
 *
 * "Remember me" support: `setTokens`'s `persist` flag chooses which Web
 * Storage backend to write to — `localStorage` (survives closing the
 * browser) when the user checked "Remember me" at login, `sessionStorage`
 * (cleared when the tab/browser closes) when they didn't. Reads check
 * both, since a page load doesn't know in advance which one holds the
 * active session, and `setTokens` always clears the *other* backend first
 * so a stale copy can never linger and get read by mistake after the user
 * explicitly chose the opposite persistence mode.
 */

const ACCESS_TOKEN_KEY = "ecommerce_access_token";
const REFRESH_TOKEN_KEY = "ecommerce_refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Whether the *current* session is in "remember me" (localStorage) mode.
 * Used by axiosClient's silent-refresh interceptor so a rotated token
 * lands back in whichever backend the user originally chose at login,
 * instead of the refresh silently promoting a session-only login into a
 * persistent one (or vice versa).
 */
export function isPersistentSession() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) !== null;
}

export function setTokens({ access, refresh }, persist = true) {
  const target = persist ? localStorage : sessionStorage;
  const other = persist ? sessionStorage : localStorage;

  other.removeItem(ACCESS_TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);

  if (access) target.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) target.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
