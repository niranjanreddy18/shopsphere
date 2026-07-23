import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DollarSign } from "lucide-react";

import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard label="Total Revenue" value="$1,234.56" />);
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
  });

  it("renders the sublabel when provided", () => {
    render(<StatCard label="Total Orders" value={42} sublabel="12 this month" />);
    expect(screen.getByText("12 this month")).toBeInTheDocument();
  });

  it("does not render a sublabel element when omitted", () => {
    const { container } = render(<StatCard label="Total Orders" value={42} />);
    expect(container.querySelectorAll("p").length).toBe(1); // only the value, no sublabel <p>
  });

  it("renders the icon when provided", () => {
    const { container } = render(<StatCard label="Revenue" value="$0" icon={DollarSign} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
