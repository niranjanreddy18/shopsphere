import { describe, expect, it } from "vitest";

import { extractErrorMessage } from "./apiErrors";

describe("extractErrorMessage", () => {
  it("returns a network-error message when there's no response at all", () => {
    expect(extractErrorMessage({}, "Fallback message.")).toMatch(/network error/i);
  });

  it("returns a network-error message for a request that never reached the server", () => {
    const error = { request: {} }; // Axios sets `request` but not `response` on network failures
    expect(extractErrorMessage(error, "Fallback.")).toMatch(/network error/i);
  });

  it("returns a generic server-error message for 5xx responses", () => {
    const error = { response: { status: 500, data: { message: "Internal Server Error" } } };
    expect(extractErrorMessage(error, "Fallback.")).toMatch(/something went wrong on our end/i);
  });

  it("prefers a top-level message field for 4xx responses", () => {
    const error = { response: { status: 400, data: { message: "Explicit message." } } };
    expect(extractErrorMessage(error, "Fallback.")).toBe("Explicit message.");
  });

  it("extracts the first error from a field-level errors object", () => {
    const error = { response: { status: 400, data: { errors: { email: ["This field is required."] } } } };
    expect(extractErrorMessage(error, "Fallback.")).toBe("This field is required.");
  });

  it("stringifies a non-array field-level error value", () => {
    const error = { response: { status: 404, data: { errors: { detail: "Not found." } } } };
    expect(extractErrorMessage(error, "Fallback.")).toBe("Not found.");
  });

  it("falls back when data exists but has neither message nor errors", () => {
    const error = { response: { status: 400, data: {} } };
    expect(extractErrorMessage(error, "Fallback.")).toBe("Fallback.");
  });
});
