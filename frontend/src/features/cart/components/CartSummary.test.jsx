/**
 * Component tests for CartSummary. Now rendered through renderWithProviders
 * (rather than a bare render) because the component uses useNavigate (needs
 * a Router) and useAuth (reads Redux state) for its checkout button.
 */

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/testUtils";
import CartSummary from "./CartSummary";

const mockSummary = {
  item_count: 3,
  subtotal: "100.00",
  discount: "10.00",
  coupon_code: "SAVE10",
  coupon_error: null,
  shipping: "0.00",
  tax: "7.20",
  total: "97.20",
};

describe("CartSummary", () => {
  it("renders the subtotal, discount, shipping, tax, and total", () => {
    renderWithProviders(<CartSummary summary={mockSummary} onApplyCoupon={vi.fn()} onRemoveCoupon={vi.fn()} />);

    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("-$10.00")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument(); // $0.00 shipping renders as "Free"
    expect(screen.getByText("$7.20")).toBeInTheDocument();
    expect(screen.getByText("$97.20")).toBeInTheDocument();
  });

  it("shows the applied coupon code instead of the entry form", () => {
    renderWithProviders(<CartSummary summary={mockSummary} onApplyCoupon={vi.fn()} onRemoveCoupon={vi.fn()} />);
    expect(screen.getByText("SAVE10")).toBeInTheDocument();
  });

  it("disables checkout when the cart is empty", () => {
    renderWithProviders(
      <CartSummary
        summary={{ ...mockSummary, item_count: 0, coupon_code: null }}
        onApplyCoupon={vi.fn()}
        onRemoveCoupon={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /proceed to checkout/i })).toBeDisabled();
  });
});
