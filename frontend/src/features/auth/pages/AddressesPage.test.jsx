import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  state: { address: { items: [], status: "succeeded" } },
}));

vi.mock("../../../app/store/hooks", () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: (selector) => selector(mocks.state),
}));

vi.mock("../addressSlice", () => ({
  createAddress: Object.assign(vi.fn((payload) => ({ type: "address/create", payload })), {
    fulfilled: { match: (result) => result?.type === "address/create/fulfilled" },
  }),
  updateAddress: Object.assign(vi.fn((payload) => ({ type: "address/update", payload })), {
    fulfilled: { match: (result) => result?.type === "address/update/fulfilled" },
  }),
  deleteAddress: vi.fn((id) => ({ type: "address/delete", payload: id })),
  fetchAddresses: vi.fn(() => ({ type: "address/fetch" })),
  setDefaultAddress: vi.fn((id) => ({ type: "address/setDefault", payload: id })),
}));

vi.mock("../components/AddressForm", () => ({
  default: ({ onSubmit }) => (
    <button type="button" onClick={() => onSubmit({ full_name: "Jane Doe" })}>
      Save test address
    </button>
  ),
}));

vi.mock("../components/AddressCard", () => ({ default: () => null }));

import AddressesPage from "./AddressesPage";

function CheckoutDestination() {
  return <h1>Checkout</h1>;
}

describe("AddressesPage checkout return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dispatch.mockImplementation(async () => ({
      type: "address/create/fulfilled",
      payload: { id: "address-1", full_name: "Jane Doe" },
    }));
  });

  it("returns to checkout after successfully creating an address from checkout", async () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/profile/addresses", state: { returnTo: "/checkout" } }]}
      >
        <Routes>
          <Route path="/profile/addresses" element={<AddressesPage />} />
          <Route path="/checkout" element={<CheckoutDestination />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Add address" }));
    fireEvent.click(screen.getByRole("button", { name: "Save test address" }));

    expect(await screen.findByRole("heading", { name: "Checkout" })).toBeInTheDocument();
  });
});
