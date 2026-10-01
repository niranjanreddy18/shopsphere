import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  recordRecentlyViewed: vi.fn(),
  state: {
    products: {
      currentProduct: {
        id: "product-1",
        slug: "widget",
        name: "Widget",
        category: { name: "Electronics", slug: "electronics" },
        brand: null,
        images: [],
        effective_price: "12.00",
        discount_percentage: 0,
        price: "12.00",
        is_in_stock: true,
        inventory: { available_quantity: 5 },
        short_description: "A test product",
        average_rating: null,
        review_count: 0,
        description: "Product description",
      },
      currentProductStatus: "succeeded",
      related: { items: [], status: "idle" },
    },
    wishlist: { items: [] },
  },
}));

vi.mock("../../../app/store/hooks", () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: (selector) => selector(mocks.state),
}));

vi.mock("../../../api/productsApi", () => ({
  productsApi: {
    recordRecentlyViewed: mocks.recordRecentlyViewed,
  },
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ slug: "widget" }),
}));

vi.mock("../components/ProductImageGallery", () => ({ default: () => null }));
vi.mock("../components/ProductCollectionSection", () => ({ default: () => null }));
vi.mock("../components/ProductReviewsSection", () => ({ default: () => null }));
vi.mock("../components/RecentlyViewedSection", () => ({ default: () => null }));
vi.mock("../components/SpecificationsTable", () => ({ default: () => null }));
vi.mock("../components/DeliveryReturnInfo", () => ({ default: () => null }));
vi.mock("../../../components/ui/StarRating", () => ({ default: () => null }));
vi.mock("../../../components/ui/Skeleton", () => ({ ProductDetailSkeleton: () => null }));
vi.mock("../../../components/common/ErrorMessage", () => ({ default: () => null }));

import ProductDetailsPage from "./ProductDetailsPage";

describe("ProductDetailsPage recently viewed recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recordRecentlyViewed.mockResolvedValue({ success: true });
  });

  it("records the loaded product in the background", async () => {
    render(<ProductDetailsPage />);

    expect(screen.getByRole("heading", { name: "Widget" })).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.recordRecentlyViewed).toHaveBeenCalledWith("product-1");
    });
  });

  it("keeps the product page available when recording fails", async () => {
    mocks.recordRecentlyViewed.mockRejectedValue(new Error("offline"));

    render(<ProductDetailsPage />);

    expect(screen.getByRole("heading", { name: "Widget" })).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.recordRecentlyViewed).toHaveBeenCalledWith("product-1");
    });
    expect(screen.getByText("A test product")).toBeInTheDocument();
  });
});
