/**
 * Product slice — owns:
 *   - the paginated product listing (used by ProductListingPage /
 *     CategoryPage / SearchPage, which all share one "listing" shape)
 *   - the current product detail + its related products
 *   - the three curated home-page collections (featured / new arrivals /
 *     best sellers), kept as separate small pieces of state since they
 *     load independently and shouldn't overwrite each other
 *   - the category/brand lookup lists used to build filter UI
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { productsApi } from "../../api/productsApi";
import { extractErrorMessage } from "../../utils/apiErrors";

const emptyListing = { results: [], count: 0, totalPages: 0, currentPage: 1, status: "idle", error: null };

const initialState = {
  listing: { ...emptyListing },
  currentProduct: null,
  currentProductStatus: "idle",
  related: { items: [], status: "idle" },
  featured: { items: [], status: "idle" },
  newArrivals: { items: [], status: "idle" },
  bestSellers: { items: [], status: "idle" },
  categories: { items: [], status: "idle" },
  brands: { items: [], status: "idle" },
};

export const fetchProducts = createAsyncThunk("products/fetchList", async (params, { rejectWithValue }) => {
  try {
    return { data: await productsApi.list(params), page: params?.page || 1 };
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load products."));
  }
});

export const fetchProductDetail = createAsyncThunk(
  "products/fetchDetail",
  async (slug, { rejectWithValue }) => {
    try {
      return await productsApi.detail(slug);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Product not found."));
    }
  }
);

export const fetchRelatedProducts = createAsyncThunk("products/fetchRelated", async (slug) => {
  const data = await productsApi.related(slug);
  return data.results ?? data;
});

export const fetchFeaturedProducts = createAsyncThunk("products/fetchFeatured", async (params) => {
  const data = await productsApi.featured(params);
  return data.results ?? data;
});

export const fetchNewArrivals = createAsyncThunk("products/fetchNewArrivals", async (params) => {
  const data = await productsApi.newArrivals(params);
  return data.results ?? data;
});

export const fetchBestSellers = createAsyncThunk("products/fetchBestSellers", async (params) => {
  const data = await productsApi.bestSellers(params);
  return data.results ?? data;
});

export const fetchCategories = createAsyncThunk("products/fetchCategories", async () => {
  const data = await productsApi.categories();
  return data.results ?? data;
});

export const fetchBrands = createAsyncThunk("products/fetchBrands", async () => {
  const data = await productsApi.brands();
  return data.results ?? data;
});

const productSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    /** Clears the detail page's product so a stale product doesn't flash while a new slug loads. */
    clearCurrentProduct(state) {
      state.currentProduct = null;
      state.currentProductStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      // --- listing -----------------------------------------------------
      .addCase(fetchProducts.pending, (state) => {
        state.listing.status = "loading";
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        const { data, page } = action.payload;
        state.listing.status = "succeeded";
        state.listing.results = data.results;
        state.listing.count = data.count;
        state.listing.totalPages = data.total_pages;
        state.listing.currentPage = page;
        state.listing.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.listing.status = "failed";
        state.listing.error = action.payload;
      })
      // --- detail --------------------------------------------------------
      .addCase(fetchProductDetail.pending, (state) => {
        state.currentProductStatus = "loading";
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.currentProductStatus = "succeeded";
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductDetail.rejected, (state) => {
        state.currentProductStatus = "failed";
        state.currentProduct = null;
      })
      // --- related -------------------------------------------------------
      .addCase(fetchRelatedProducts.pending, (state) => {
        state.related.status = "loading";
      })
      .addCase(fetchRelatedProducts.fulfilled, (state, action) => {
        state.related.status = "succeeded";
        state.related.items = action.payload;
      })
      // --- curated collections ---------------------------------------------
      .addCase(fetchFeaturedProducts.pending, (state) => {
        state.featured.status = "loading";
      })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.featured.status = "succeeded";
        state.featured.items = action.payload;
      })
      .addCase(fetchNewArrivals.pending, (state) => {
        state.newArrivals.status = "loading";
      })
      .addCase(fetchNewArrivals.fulfilled, (state, action) => {
        state.newArrivals.status = "succeeded";
        state.newArrivals.items = action.payload;
      })
      .addCase(fetchBestSellers.pending, (state) => {
        state.bestSellers.status = "loading";
      })
      .addCase(fetchBestSellers.fulfilled, (state, action) => {
        state.bestSellers.status = "succeeded";
        state.bestSellers.items = action.payload;
      })
      // --- filter lookups --------------------------------------------------
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories.status = "succeeded";
        state.categories.items = action.payload;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.brands.status = "succeeded";
        state.brands.items = action.payload;
      });
  },
});

export const { clearCurrentProduct } = productSlice.actions;
export default productSlice.reducer;
