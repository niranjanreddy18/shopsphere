/**
 * Tests for orderSlice's reducer behaviour — checkout submission state,
 * order history pagination, and current-order detail.
 */

import { describe, expect, it } from "vitest";

import reducer, { cancelOrder, fetchOrderDetail, fetchOrderHistory, placeOrder } from "./orderSlice";

const mockOrder = { id: "o1", order_number: "ORD-20260101-ABC123", status: "PENDING", total_amount: "59.99" };

describe("orderSlice", () => {
  it("returns the initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.checkoutStatus).toBe("idle");
    expect(state.currentOrder).toBeNull();
    expect(state.history.results).toEqual([]);
  });

  it("sets checkoutStatus to loading on placeOrder.pending", () => {
    const state = reducer(undefined, { type: placeOrder.pending.type });
    expect(state.checkoutStatus).toBe("loading");
  });

  it("stores the placed order on placeOrder.fulfilled", () => {
    const state = reducer(undefined, { type: placeOrder.fulfilled.type, payload: mockOrder });
    expect(state.checkoutStatus).toBe("succeeded");
    expect(state.currentOrder).toEqual(mockOrder);
  });

  it("stores the error message on placeOrder.rejected", () => {
    const state = reducer(undefined, { type: placeOrder.rejected.type, payload: "Your cart is empty." });
    expect(state.checkoutStatus).toBe("failed");
    expect(state.error).toBe("Your cart is empty.");
  });

  it("populates order history on fetchOrderHistory.fulfilled", () => {
    const payload = { results: [mockOrder], count: 1, total_pages: 1 };
    const state = reducer(undefined, { type: fetchOrderHistory.fulfilled.type, payload });

    expect(state.history.status).toBe("succeeded");
    expect(state.history.results).toHaveLength(1);
    expect(state.history.count).toBe(1);
  });

  it("sets the current order on fetchOrderDetail.fulfilled", () => {
    const state = reducer(undefined, { type: fetchOrderDetail.fulfilled.type, payload: mockOrder });
    expect(state.currentOrderStatus).toBe("succeeded");
    expect(state.currentOrder).toEqual(mockOrder);
  });

  it("replaces the current order with the cancelled version on cancelOrder.fulfilled", () => {
    const cancelledOrder = { ...mockOrder, status: "CANCELLED" };
    const state = reducer(undefined, { type: cancelOrder.fulfilled.type, payload: cancelledOrder });
    expect(state.currentOrder.status).toBe("CANCELLED");
  });
});
