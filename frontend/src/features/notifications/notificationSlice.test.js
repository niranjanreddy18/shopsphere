import { describe, expect, it } from "vitest";

import reducer, { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "./notificationSlice";

const mockNotifications = [
  { id: "n1", title: "Order placed", message: "m1", is_read: false },
  { id: "n2", title: "Order shipped", message: "m2", is_read: false },
];

describe("notificationSlice", () => {
  it("returns the initial state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.items).toEqual([]);
  });

  it("populates items on fetchNotifications.fulfilled", () => {
    const state = reducer(undefined, { type: fetchNotifications.fulfilled.type, payload: mockNotifications });
    expect(state.items).toHaveLength(2);
  });

  it("updates a single notification on markNotificationRead.fulfilled", () => {
    const startState = reducer(undefined, { type: fetchNotifications.fulfilled.type, payload: mockNotifications });
    const state = reducer(startState, {
      type: markNotificationRead.fulfilled.type,
      payload: { ...mockNotifications[0], is_read: true },
    });

    expect(state.items.find((n) => n.id === "n1").is_read).toBe(true);
    expect(state.items.find((n) => n.id === "n2").is_read).toBe(false);
  });

  it("marks every notification read on markAllNotificationsRead.fulfilled", () => {
    const startState = reducer(undefined, { type: fetchNotifications.fulfilled.type, payload: mockNotifications });
    const state = reducer(startState, { type: markAllNotificationsRead.fulfilled.type });

    expect(state.items.every((n) => n.is_read)).toBe(true);
  });
});
