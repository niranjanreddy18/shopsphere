import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../../test/testUtils";
import ProductGrid from "./ProductGrid";

const mockProducts = [
  { id: "p1", slug: "widget", name: "Widget", price: "10.00", effective_price: "10.00", discount_percentage: 0, is_in_stock: true },
  { id: "p2", slug: "gadget", name: "Gadget", price: "20.00", effective_price: "20.00", discount_percentage: 0, is_in_stock: true },
];

describe("ProductGrid", () => {
  it("shows a skeleton while loading", () => {
    const { container } = renderWithProviders(<ProductGrid products={[]} status="loading" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows the empty message when there are no products", () => {
    renderWithProviders(<ProductGrid products={[]} status="succeeded" emptyMessage="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("renders a card for every product", () => {
    renderWithProviders(<ProductGrid products={mockProducts} status="succeeded" />);
    expect(screen.getByText("Widget")).toBeInTheDocument();
    expect(screen.getByText("Gadget")).toBeInTheDocument();
  });
});
