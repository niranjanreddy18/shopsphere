import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SortDropdown from "./SortDropdown";

describe("SortDropdown", () => {
  it("defaults to 'Newest' when no value is provided", () => {
    render(<SortDropdown value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveValue("-created_at");
  });

  it("renders every sort option", () => {
    render(<SortDropdown value="price" onChange={vi.fn()} />);
    expect(screen.getByText("Price: Low to High")).toBeInTheDocument();
    expect(screen.getByText("Price: High to Low")).toBeInTheDocument();
    expect(screen.getByText("Best Selling")).toBeInTheDocument();
    expect(screen.getByText("Name: A to Z")).toBeInTheDocument();
  });

  it("calls onChange with the selected value", () => {
    const onChange = vi.fn();
    render(<SortDropdown value="-created_at" onChange={onChange} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "-sold_count" } });
    expect(onChange).toHaveBeenCalledWith("-sold_count");
  });
});
