/**
 * Component tests for ProductCard, rendered through renderWithProviders so
 * its useAppSelector/useAppDispatch calls (wishlist state, add-to-cart
 * thunk) and <Link> resolve correctly.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/testUtils";
import ProductCard from "./ProductCard";

// Mocked so the "dispatches addToCart" test below doesn't attempt a real
// network call (there's no backend running in the test environment) and
// so we can deterministically control when the request "resolves".
vi.mock("../../../api/cartApi", () => ({
  cartApi: { addItem: vi.fn(() => new Promise(() => {})) }, // never resolves — we only assert the pending state
}));

const mockProduct = {
  id: "p1",
  slug: "wireless-mouse",
  name: "Wireless Mouse",
  brand_name: "Logitech",
  price: "29.99",
  effective_price: "24.99",
  discount_percentage: 17,
  primary_image: null,
  is_in_stock: true,
};

describe("ProductCard", () => {
  it("renders the product name, brand, and effective price", () => {
    renderWithProviders(<ProductCard product={mockProduct} />);

    expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
    expect(screen.getByText("Logitech")).toBeInTheDocument();
    expect(screen.getByText("$24.99")).toBeInTheDocument();
  });

  it("shows a strike-through original price and discount badge when discounted", () => {
    renderWithProviders(<ProductCard product={mockProduct} />);

    expect(screen.getByText("$29.99")).toBeInTheDocument();
    expect(screen.getByText("-17%")).toBeInTheDocument();
  });

  it("disables the add-to-cart button and shows 'Unavailable' when out of stock", () => {
    renderWithProviders(<ProductCard product={{ ...mockProduct, is_in_stock: false }} />);

    const button = screen.getByRole("button", { name: /unavailable/i });
    expect(button).toBeDisabled();
  });

  it("does not show the wishlist toggle for a logged-out (guest) visitor", () => {
    renderWithProviders(<ProductCard product={mockProduct} />, {
      preloadedState: { auth: { isAuthenticated: false, user: null } },
    });

    expect(screen.queryByLabelText(/add to wishlist/i)).not.toBeInTheDocument();
  });

  it("dispatches addToCart when the add-to-cart button is clicked", async () => {
    const { store } = renderWithProviders(<ProductCard product={mockProduct} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    // The thunk's pending action should have fired synchronously before the
    // (mocked-network) async portion resolves — enough to prove the click
    // handler dispatched the right thunk rather than asserting on the
    // eventual network result.
    expect(store.getState().cart.mutationStatus).toBe("loading");
  });
});
