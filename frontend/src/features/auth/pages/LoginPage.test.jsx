import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../../../api/authApi", () => ({
  authApi: {
    login: mocks.login,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

import { renderWithProviders } from "../../../test/testUtils";
import LoginPage from "./LoginPage";

function fillLoginForm() {
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "jane@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "WrongPass1!" } });
}

describe("LoginPage server validation errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows specific invalid credentials error inline and in toast instead of 'Validation failed'", async () => {
    mocks.login.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          message: "Validation failed",
          errors: { non_field_errors: ["Invalid email or password."] },
        },
      },
    });

    renderWithProviders(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Invalid email or password.");
    });
  });

  it("shows disabled-account message when server rejects disabled user", async () => {
    mocks.login.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          message: "This account has been disabled. Please contact support for assistance.",
          errors: {
            non_field_errors: ["This account has been disabled. Please contact support for assistance."],
          },
        },
      },
    });

    renderWithProviders(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This account has been disabled. Please contact support for assistance."
    );
  });

  it("maps field-level server errors directly to email/password inputs", async () => {
    mocks.login.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          message: "Validation failed",
          errors: { email: ["Enter a valid email address."] },
        },
      },
    });

    renderWithProviders(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  });
});

