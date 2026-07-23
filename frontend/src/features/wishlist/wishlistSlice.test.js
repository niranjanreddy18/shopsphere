import { describe, expect, it } from "vitest";

import reducer, { addToWishlist, fetchWishlist, removeFromWishlist } from "./wishlistSlice";

const mockItem = { id: "wi-1", product: { id: "p1", name: "Widget" }, created_at: "2026-01-01" };

describe("wishlistSlice", () => {
  it("returns the initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.items).toEqual([]);
  });

  it("populates items on fetchWishlist.fulfilled", () => {
    const state = reducer(undefined, { type: fetchWishlist.fulfilled.type, payload: [mockItem] });
    expect(state.items).toHaveLength(1);
    expect(state.status).toBe("succeeded");
  });

  it("prepends a new item on addToWishlist.fulfilled", () => {
    const secondItem = { id: "wi-2", product: { id: "p2", name: "Gadget" } };
    const startState = reducer(undefined, { type: fetchWishlist.fulfilled.type, payload: [mockItem] });
    const state = reducer(startState, { type: addToWishlist.fulfilled.type, payload: secondItem });

    expect(state.items).toHaveLength(2);
    expect(state.items[0].id).toBe("wi-2");
  });

  it("removes the matching item by product id on removeFromWishlist.fulfilled", () => {
    const startState = reducer(undefined, { type: fetchWishlist.fulfilled.type, payload: [mockItem] });
    const state = reducer(startState, { type: removeFromWishlist.fulfilled.type, payload: "p1" });

    expect(state.items).toHaveLength(0);
  });
});
