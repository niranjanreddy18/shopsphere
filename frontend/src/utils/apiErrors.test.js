import { describe, expect, it } from "vitest";

import { extractErrorMessage, extractFieldErrors } from "./apiErrors";

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

  it("ignores generic 'Validation failed' message when specific errors exist", () => {
    const error = {
      response: {
        status: 400,
        data: {
          message: "Validation failed",
          errors: { email: ["An account with this email already exists."] },
        },
      },
    };
    expect(extractErrorMessage(error, "Fallback.")).toBe("An account with this email already exists.");
  });

  it("ignores generic 'Request failed' message when detail error exists", () => {
    const error = {
      response: {
        status: 401,
        data: {
          message: "Request failed",
          errors: { detail: "Invalid credentials." },
        },
      },
    };
    expect(extractErrorMessage(error, "Fallback.")).toBe("Invalid credentials.");
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

describe("extractFieldErrors", () => {
  it("extracts field-level errors and excludes non_field_errors and detail", () => {
    const error = {
      response: {
        status: 400,
        data: {
          errors: {
            email: ["An account with this email already exists."],
            password: ["This password is too common."],
            non_field_errors: ["Invalid email or password."],
            detail: "Bad request.",
          },
        },
      },
    };
    expect(extractFieldErrors(error)).toEqual({
      email: "An account with this email already exists.",
      password: "This password is too common.",
    });
  });

  it("returns empty object when no errors object exists", () => {
    expect(extractFieldErrors({})).toEqual({});
  });
});
