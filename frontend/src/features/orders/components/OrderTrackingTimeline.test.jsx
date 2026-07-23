import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OrderTrackingTimeline from "./OrderTrackingTimeline";

const baseOrder = {
  tracking_number: "",
  carrier: "",
  estimated_delivery_date: null,
  status_history: [
    { id: "h1", status: "PENDING", note: "Order placed.", created_at: "2026-01-01T10:00:00Z" },
    { id: "h2", status: "CONFIRMED", note: "", created_at: "2026-01-02T10:00:00Z" },
  ],
};

describe("OrderTrackingTimeline", () => {
  it("renders every status history entry", () => {
    render(<OrderTrackingTimeline order={baseOrder} />);
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
    expect(screen.getByText("Order placed.")).toBeInTheDocument();
  });

  it("does not show tracking info when no tracking number is set", () => {
    render(<OrderTrackingTimeline order={baseOrder} />);
    expect(screen.queryByText(/tracking number/i)).not.toBeInTheDocument();
  });

  it("shows carrier and tracking number when present", () => {
    const order = { ...baseOrder, tracking_number: "1Z999", carrier: "UPS" };
    render(<OrderTrackingTimeline order={order} />);
    expect(screen.getByText(/UPS tracking number/i)).toBeInTheDocument();
    expect(screen.getByText("1Z999")).toBeInTheDocument();
  });
});
