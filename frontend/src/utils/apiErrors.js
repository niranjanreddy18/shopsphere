/**
 * extractErrorMessage — the single place every Redux slice turns an Axios
 * error into a human-readable string for toasts/inline error state.
 *
 * Consolidated here after the same ~5-line function was independently
 * copy-pasted into six slices (auth, address, cart, products, wishlist,
 * orders) during earlier prompts — each copy handled the backend's error
 * envelope (see core.exceptions.custom_exception_handler on the backend:
 * `{ success, message, errors }`) slightly differently, which was a latent
 * bug (some slices didn't surface field-level validation errors at all).
 * One shared implementation means that fix only had to happen once, and
 * every slice benefits identically going forward.
 *
 * Distinguishes three failure shapes rather than collapsing everything
 * into the caller's generic fallback text:
 *   1. No response at all (`error.response` undefined) — the request
 *      never reached the server: offline, DNS failure, CORS block, or the
 *      backend is simply down. Surfaced as a clear network message rather
 *      than a misleading "Login failed."/"Failed to add item." that
 *      implies the *server* rejected something.
 *   2. A 5xx response — the request reached the server, but the server
 *      itself failed. Distinct from a validation failure (4xx), where the
 *      server is working correctly and telling the client it did
 *      something wrong.
 *   3. A structured 4xx error envelope — the normal case, handled as
 *      before (prefer `message`, fall back to the first field-level error).
 */

const GENERIC_ENVELOPE_MESSAGES = new Set(["Validation failed", "Request failed"]);

function extractFirstError(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = extractFirstError(item);
      if (msg) return msg;
    }
    return null;
  }
  if (typeof value === "object") {
    if (value.non_field_errors) {
      const msg = extractFirstError(value.non_field_errors);
      if (msg) return msg;
    }
    if (value.detail) {
      const msg = extractFirstError(value.detail);
      if (msg) return msg;
    }
    for (const fieldValue of Object.values(value)) {
      const msg = extractFirstError(fieldValue);
      if (msg) return msg;
    }
    return null;
  }
  return String(value);
}

/**
 * Extracts field-level error messages from `{ errors: { field: [...] } }`,
 * excluding non-field keys (`non_field_errors`, `detail`).
 */
export function extractFieldErrors(error) {
  const errors = error?.response?.data?.errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return {};
  }

  const fieldErrors = {};
  for (const [field, value] of Object.entries(errors)) {
    if (field === "non_field_errors" || field === "detail") continue;
    const msg = extractFirstError(value);
    if (msg) {
      fieldErrors[field] = msg;
    }
  }
  return fieldErrors;
}

export function extractErrorMessage(error, fallback) {
  if (!error?.response) {
    return "Network error — please check your internet connection and try again.";
  }

  if (error.response.status >= 500) {
    return "Something went wrong on our end. Please try again in a moment.";
  }

  const data = error.response.data;
  if (!data) return fallback;
  if (data.message && !GENERIC_ENVELOPE_MESSAGES.has(data.message)) {
    return data.message;
  }
  if (data.errors) {
    const fieldMessage = extractFirstError(data.errors);
    if (fieldMessage) return fieldMessage;
  }
  if (data.message) return data.message;
  if (data.detail) {
    const detailMessage = extractFirstError(data.detail);
    if (detailMessage) return detailMessage;
  }
  return fallback;
}
