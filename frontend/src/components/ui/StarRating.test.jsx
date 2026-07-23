import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import StarRating from "./StarRating";

describe("StarRating", () => {
  it("renders nothing when rating is null (no reviews yet)", () => {
    const { container } = render(<StarRating rating={null} reviewCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an accessible label describing the rating", () => {
    render(<StarRating rating={4.5} reviewCount={12} />);
    expect(screen.getByRole("img", { name: /rated 4.5 out of 5 stars/i })).toBeInTheDocument();
  });

  it("shows the numeric rating and review count", () => {
    render(<StarRating rating={4.3} reviewCount={87} />);
    expect(screen.getByText(/4.3/)).toBeInTheDocument();
    expect(screen.getByText(/\(87\)/)).toBeInTheDocument();
  });

  it("hides the review count parentheses when there are zero reviews", () => {
    render(<StarRating rating={0} reviewCount={0} />);
    expect(screen.queryByText(/\(0\)/)).not.toBeInTheDocument();
  });

  it("omits the numeric label when showCount is false", () => {
    render(<StarRating rating={4} reviewCount={10} showCount={false} />);
    expect(screen.queryByText(/4\.0/)).not.toBeInTheDocument();
  });
});
