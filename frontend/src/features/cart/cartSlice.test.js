/**
 * Tests for cartSlice's reducer behaviour, including the shared
 * pending/fulfilled/rejected matcher that every mutation thunk
 * (addToCart, updateCartItemQuantity, removeCartItem, ...) funnels through.
 */

import { describe, expect, it } from "vitest";

import reducer, { addToCart, fetchCart, setCouponCode, updateCartItemQuantity } from "./cartSlice";

const mockCart = {
  id: "cart-1",
  cart_token: null,
  items: [{ id: "item-1", quantity: 2, line_total: "20.00", product: { id: "p1", name: "Widget" } }],
  saved_for_later: [],
  summary: { item_count: 2, subtotal: "20.00", discount: "0.00", shipping: "5.00", tax: "1.60", total: "26.60" },
};

describe("cartSlice", () => {
  it("returns the initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.cart).toBeNull();
    expect(state.status).toBe("idle");
  });

  it("sets status to loading on fetchCart.pending", () => {
    const state = reducer(undefined, { type: fetchCart.pending.type });
    expect(state.status).toBe("loading");
  });

  it("stores the cart on fetchCart.fulfilled", () => {
    const state = reducer(undefined, { type: fetchCart.fulfilled.type, payload: mockCart });
    expect(state.status).toBe("succeeded");
    expect(state.cart).toEqual(mockCart);
  });

  it("updates the cart via the shared mutation matcher on addToCart.fulfilled", () => {
    const updatedCart = { ...mockCart, items: [...mockCart.items, { id: "item-2" }] };
    const state = reducer(undefined, { type: addToCart.fulfilled.type, payload: updatedCart });

    expect(state.mutationStatus).toBe("succeeded");
    expect(state.cart.items).toHaveLength(2);
  });

  it("updates the cart via the shared mutation matcher on updateCartItemQuantity.fulfilled", () => {
    const updatedCart = { ...mockCart, summary: { ...mockCart.summary, subtotal: "30.00" } };
    const state = reducer(undefined, {
      type: updateCartItemQuantity.fulfilled.type,
      payload: updatedCart,
    });

    expect(state.cart.summary.subtotal).toBe("30.00");
  });

  it("sets mutationStatus to failed on a rejected mutation thunk", () => {
    const state = reducer(undefined, { type: addToCart.rejected.type, payload: "Out of stock" });
    expect(state.mutationStatus).toBe("failed");
    expect(state.error).toBe("Out of stock");
  });

  it("stores the applied coupon code via the setCouponCode reducer", () => {
    const state = reducer(undefined, setCouponCode("SAVE10"));
    expect(state.couponCode).toBe("SAVE10");
  });
});
