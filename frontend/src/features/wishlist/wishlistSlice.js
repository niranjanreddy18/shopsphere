/**
 * Wishlist slice — owns the authenticated user's wishlist items.
 * Unlike the cart, the wishlist has no guest mode (see backend
 * apps/wishlist/views.py: every endpoint requires authentication), so this
 * slice's thunks are only ever dispatched once `isAuthenticated` is true.
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

import { wishlistApi } from "../../api/wishlistApi";
import { extractErrorMessage } from "../../utils/apiErrors";

const initialState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchWishlist = createAsyncThunk("wishlist/fetch", async (_, { rejectWithValue }) => {
  try {
    const data = await wishlistApi.list();
    return data.results ?? data;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load wishlist."));
  }
});

export const addToWishlist = createAsyncThunk("wishlist/add", async (productId, { rejectWithValue }) => {
  try {
    const data = await wishlistApi.add(productId);
    toast.success("Added to wishlist.");
    return data;
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to add to wishlist.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const removeFromWishlist = createAsyncThunk(
  "wishlist/remove",
  async (productId, { rejectWithValue }) => {
    try {
      await wishlistApi.remove(productId);
      return productId;
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to remove from wishlist.");
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const moveWishlistItemToCart = createAsyncThunk(
  "wishlist/moveToCart",
  async (productId, { rejectWithValue }) => {
    try {
      await wishlistApi.moveToCart(productId);
      toast.success("Moved to cart.");
      return productId;
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to move item to cart.");
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    /** Clears wishlist state on logout so the next user never sees a stale list. */
    clearWishlist(state) {
      state.items = [];
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.product.id !== action.payload);
      })
      .addCase(moveWishlistItemToCart.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.product.id !== action.payload);
      });
  },
});

export const { clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
