/**
 * Component tests for Pagination — pure UI component, no Redux/router
 * dependency, so it's rendered directly rather than via renderWithProviders.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Pagination from "./Pagination";

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders page numbers and highlights the current page", () => {
    render(<Pagination currentPage={2} totalPages={3} onPageChange={() => {}} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("disables Prev on the first page and Next on the last page", () => {
    render(<Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByText("Prev")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("calls onPageChange with the clicked page number", () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByText("2"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with currentPage + 1 when Next is clicked", () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("condenses a large page range with ellipses", () => {
    render(<Pagination currentPage={10} totalPages={20} onPageChange={() => {}} />);
    const ellipses = screen.getAllByText("…");
    expect(ellipses.length).toBeGreaterThan(0);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});
