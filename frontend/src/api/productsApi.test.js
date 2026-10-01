import { beforeEach, describe, expect, it, vi } from "vitest";

import axiosClient from "./axiosClient";
import { productsApi } from "./productsApi";

vi.mock("./axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("productsApi recently viewed methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a product view without sending a user identifier", async () => {
    axiosClient.post.mockResolvedValue({ data: { success: true } });

    await productsApi.recordRecentlyViewed("product-20");

    expect(axiosClient.post).toHaveBeenCalledWith("/products/recently-viewed/", {
      product_id: "product-20",
    });
  });

  it("retrieves recently viewed products from the authenticated API", async () => {
    const response = { results: [{ id: "product-20", name: "Widget" }] };
    axiosClient.get.mockResolvedValue({ data: response });

    await expect(productsApi.recentlyViewed()).resolves.toEqual(response);
    expect(axiosClient.get).toHaveBeenCalledWith("/products/recently-viewed/");
  });
});
