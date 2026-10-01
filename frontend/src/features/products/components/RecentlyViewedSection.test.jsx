import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { productsApi } from "../../../api/productsApi";
import RecentlyViewedSection from "./RecentlyViewedSection";

vi.mock("../../../api/productsApi", () => ({
  productsApi: {
    recentlyViewed: vi.fn(),
  },
}));

describe("RecentlyViewedSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the authenticated user's products from the API", async () => {
    const storageGetItem = vi.spyOn(Storage.prototype, "getItem");
    productsApi.recentlyViewed.mockResolvedValue({
      results: [
        {
          id: "product-1",
          slug: "widget",
          name: "Widget",
          primary_image: null,
          effective_price: "12.00",
        },
      ],
    });

    render(
      <MemoryRouter>
        <RecentlyViewedSection excludeProductId="current-product" authenticated refreshKey={1} />
      </MemoryRouter>
    );

    expect(await screen.findByText("Widget")).toBeInTheDocument();
    expect(productsApi.recentlyViewed).toHaveBeenCalledTimes(1);
    expect(storageGetItem).not.toHaveBeenCalled();
    storageGetItem.mockRestore();
  });

  it("stays hidden if retrieval fails", async () => {
    productsApi.recentlyViewed.mockRejectedValue(new Error("offline"));

    render(
      <MemoryRouter>
        <RecentlyViewedSection excludeProductId="current-product" authenticated refreshKey={1} />
      </MemoryRouter>
    );

    await waitFor(() => expect(productsApi.recentlyViewed).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Recently Viewed")).not.toBeInTheDocument();
  });

  it("does not request server history for an unauthenticated visitor", () => {
    render(
      <MemoryRouter>
        <RecentlyViewedSection excludeProductId="current-product" authenticated={false} refreshKey={1} />
      </MemoryRouter>
    );

    expect(productsApi.recentlyViewed).not.toHaveBeenCalled();
  });
});
