import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import WishlistItemCard from "./WishlistItemCard";

const mockItem = {
  id: "wi1",
  product: { id: "p1", slug: "widget", name: "Widget", effective_price: "19.99", is_in_stock: true, primary_image: null },
};

describe("WishlistItemCard", () => {
  it("renders the product name and price", () => {
    render(
      <MemoryRouter>
        <WishlistItemCard item={mockItem} onRemove={vi.fn()} onMoveToCart={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("Widget")).toBeInTheDocument();
    expect(screen.getByText("$19.99")).toBeInTheDocument();
  });

  it("disables 'Move to cart' when out of stock", () => {
    const item = { ...mockItem, product: { ...mockItem.product, is_in_stock: false } };
    render(
      <MemoryRouter>
        <WishlistItemCard item={item} onRemove={vi.fn()} onMoveToCart={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("Move to cart")).toBeDisabled();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("calls onRemove with the product id", () => {
    const onRemove = vi.fn();
    render(
      <MemoryRouter>
        <WishlistItemCard item={mockItem} onRemove={onRemove} onMoveToCart={vi.fn()} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("Remove"));
    expect(onRemove).toHaveBeenCalledWith("p1");
  });

  it("calls onMoveToCart with the product id", () => {
    const onMoveToCart = vi.fn();
    render(
      <MemoryRouter>
        <WishlistItemCard item={mockItem} onRemove={vi.fn()} onMoveToCart={onMoveToCart} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("Move to cart"));
    expect(onMoveToCart).toHaveBeenCalledWith("p1");
  });
});
