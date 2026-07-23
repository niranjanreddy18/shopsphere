/**
 * Tests for productSlice's reducer behaviour.
 *
 * These exercise the reducer directly with plain action objects (rather
 * than dispatching the real async thunk, which would require mocking
 * Axios) — the thunk's pending/fulfilled/rejected action *shapes* are what
 * the reducer responds to, and that's what's under test here.
 */

import { describe, expect, it } from "vitest";

import reducer, { fetchProductDetail, fetchProducts } from "./productSlice";

describe("productSlice", () => {
  it("returns the initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.listing.status).toBe("idle");
    expect(state.listing.results).toEqual([]);
    expect(state.currentProduct).toBeNull();
  });

  it("sets listing.status to loading on fetchProducts.pending", () => {
    const state = reducer(undefined, { type: fetchProducts.pending.type });
    expect(state.listing.status).toBe("loading");
  });

  it("populates the listing on fetchProducts.fulfilled", () => {
    const mockPayload = {
      data: { results: [{ id: "1", name: "Widget" }], count: 1, total_pages: 1 },
      page: 1,
    };
    const state = reducer(undefined, { type: fetchProducts.fulfilled.type, payload: mockPayload });

    expect(state.listing.status).toBe("succeeded");
    expect(state.listing.results).toHaveLength(1);
    expect(state.listing.count).toBe(1);
    expect(state.listing.currentPage).toBe(1);
  });

  it("stores the error message on fetchProducts.rejected", () => {
    const state = reducer(undefined, { type: fetchProducts.rejected.type, payload: "Network error" });
    expect(state.listing.status).toBe("failed");
    expect(state.listing.error).toBe("Network error");
  });

  it("sets the current product on fetchProductDetail.fulfilled", () => {
    const product = { id: "1", name: "Widget", slug: "widget" };
    const state = reducer(undefined, { type: fetchProductDetail.fulfilled.type, payload: product });

    expect(state.currentProductStatus).toBe("succeeded");
    expect(state.currentProduct).toEqual(product);
  });

  it("clears the current product on fetchProductDetail.rejected", () => {
    const state = reducer(undefined, { type: fetchProductDetail.rejected.type });
    expect(state.currentProductStatus).toBe("failed");
    expect(state.currentProduct).toBeNull();
  });
});
