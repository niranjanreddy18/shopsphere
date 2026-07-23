import { beforeEach, describe, expect, it } from "vitest";

import { clearTokens, getAccessToken, getRefreshToken, isPersistentSession, setTokens } from "./tokenStorage";

describe("tokenStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores tokens in localStorage when persist is true", () => {
    setTokens({ access: "a1", refresh: "r1" }, true);
    expect(localStorage.getItem("ecommerce_access_token")).toBe("a1");
    expect(sessionStorage.getItem("ecommerce_access_token")).toBeNull();
  });

  it("stores tokens in sessionStorage when persist is false", () => {
    setTokens({ access: "a1", refresh: "r1" }, false);
    expect(sessionStorage.getItem("ecommerce_access_token")).toBe("a1");
    expect(localStorage.getItem("ecommerce_access_token")).toBeNull();
  });

  it("clears the other backend when switching persistence modes", () => {
    setTokens({ access: "a1", refresh: "r1" }, true);
    setTokens({ access: "a2", refresh: "r2" }, false);

    expect(localStorage.getItem("ecommerce_access_token")).toBeNull();
    expect(sessionStorage.getItem("ecommerce_access_token")).toBe("a2");
  });

  it("getAccessToken checks both backends", () => {
    setTokens({ access: "a1", refresh: "r1" }, false);
    expect(getAccessToken()).toBe("a1");
  });

  it("getRefreshToken checks both backends", () => {
    setTokens({ access: "a1", refresh: "r1" }, true);
    expect(getRefreshToken()).toBe("r1");
  });

  it("isPersistentSession reflects whether the refresh token is in localStorage", () => {
    setTokens({ access: "a1", refresh: "r1" }, true);
    expect(isPersistentSession()).toBe(true);

    setTokens({ access: "a2", refresh: "r2" }, false);
    expect(isPersistentSession()).toBe(false);
  });

  it("clearTokens removes tokens from both backends", () => {
    localStorage.setItem("ecommerce_access_token", "a1");
    sessionStorage.setItem("ecommerce_refresh_token", "r1");

    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
