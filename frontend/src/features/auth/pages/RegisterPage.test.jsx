import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../../../api/authApi", () => ({
  authApi: {
    register: mocks.register,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

import { renderWithProviders } from "../../../test/testUtils";
import RegisterPage from "./RegisterPage";

function fillValidRegistrationForm() {
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Jane" } });
  fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Doe" } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "jane@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "StrongPass1!" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "StrongPass1!" } });
}

describe("RegisterPage server validation errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows email-specific error inline and in toast when email is already registered", async () => {
    mocks.register.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          message: "Validation failed",
          errors: { email: ["An account with this email already exists."] },
        },
      },
    });

    renderWithProviders(<RegisterPage />);
    fillValidRegistrationForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("An account with this email already exists.");
    });
  });

  it("shows password-specific error inline when server rejects password", async () => {
    mocks.register.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          message: "This password is too common.",
          errors: { password: ["This password is too common."] },
        },
      },
    });

    renderWithProviders(<RegisterPage />);
    fillValidRegistrationForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("This password is too common.")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("This password is too common.");
    });
  });

  it("shows non-field server errors in the form alert banner", async () => {
    mocks.register.mockRejectedValueOnce({
      response: {
        status: 429,
        data: {
          success: false,
          message: "Request was throttled.",
          errors: { detail: "Request was throttled." },
        },
      },
    });

    renderWithProviders(<RegisterPage />);
    fillValidRegistrationForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Request was throttled.");
  });
});

