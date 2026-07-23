import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CouponForm from "./CouponForm";

describe("CouponForm", () => {
  it("shows the entry form when no coupon is applied", () => {
    render(<CouponForm appliedCode={null} couponError={null} onApply={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByPlaceholderText("Coupon code")).toBeInTheDocument();
  });

  it("shows the applied coupon with a remove button", () => {
    render(<CouponForm appliedCode="SAVE10" couponError={null} onApply={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("SAVE10")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("calls onApply with the uppercased, trimmed code on submit", () => {
    const onApply = vi.fn();
    render(<CouponForm appliedCode={null} couponError={null} onApply={onApply} onRemove={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Coupon code"), { target: { value: " save10 " } });
    fireEvent.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledWith("SAVE10");
  });

  it("calls onRemove when the remove link is clicked", () => {
    const onRemove = vi.fn();
    render(<CouponForm appliedCode="SAVE10" couponError={null} onApply={vi.fn()} onRemove={onRemove} />);

    fireEvent.click(screen.getByText("Remove"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("shows a coupon error message when present", () => {
    render(<CouponForm appliedCode={null} couponError="Coupon has expired." onApply={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("Coupon has expired.")).toBeInTheDocument();
  });
});
