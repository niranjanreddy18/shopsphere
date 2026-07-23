import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import AddressSelector from "./AddressSelector";

const mockAddresses = [
  { id: "a1", full_name: "Jane Doe", line1: "1 Main St", city: "Springfield", state: "IL", postal_code: "62704", country: "USA" },
  { id: "a2", full_name: "John Doe", line1: "2 Main St", city: "Springfield", state: "IL", postal_code: "62704", country: "USA" },
];

describe("AddressSelector", () => {
  it("shows an 'add address' prompt when there are no saved addresses", () => {
    render(
      <MemoryRouter>
        <AddressSelector title="Shipping Address" addresses={[]} selectedId={null} onSelect={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText(/don't have any saved addresses/i)).toBeInTheDocument();
  });

  it("renders every address as a selectable option", () => {
    render(
      <MemoryRouter>
        <AddressSelector title="Shipping Address" addresses={mockAddresses} selectedId="a1" onSelect={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked address's id", () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <AddressSelector title="Shipping Address" addresses={mockAddresses} selectedId="a1" onSelect={onSelect} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("John Doe"));
    expect(onSelect).toHaveBeenCalledWith("a2");
  });
});
