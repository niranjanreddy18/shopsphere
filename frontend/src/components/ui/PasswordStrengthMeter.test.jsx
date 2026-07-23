import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PasswordStrengthMeter from "./PasswordStrengthMeter";

describe("PasswordStrengthMeter", () => {
  it("renders nothing for an empty password", () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows 'Very weak' for a password meeting only one requirement", () => {
    render(<PasswordStrengthMeter password="a" />);
    expect(screen.getByText("Very weak")).toBeInTheDocument();
  });

  it("shows 'Strong' when every requirement is met", () => {
    render(<PasswordStrengthMeter password="Abcdef1!" />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("lists every requirement", () => {
    render(<PasswordStrengthMeter password="test" />);
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("One uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("One lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("One number")).toBeInTheDocument();
    expect(screen.getByText("One special character")).toBeInTheDocument();
  });
});
