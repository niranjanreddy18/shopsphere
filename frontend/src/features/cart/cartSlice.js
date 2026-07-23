/**
 * Cart slice — owns the entire cart: active items, saved-for-later items,
 * and the server-computed summary (subtotal/discount/shipping/tax/total).
 *
 * Deliberately thin: nearly every thunk just calls the cart API and
 * replaces `state.cart` wholesale with whatever the backend returns, since
 * every cart mutation endpoint responds with the full, freshly-computed
 * cart (see apps/cart/views.py's `response_with_cart` helper on the
 * backend) — there's no client-side cart math to keep in sync.
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

import { cartApi } from "../../api/cartApi";
import { extractErrorMessage } from "../../utils/apiErrors";

const initialState = {
  cart: null, // { id, cart_token, items: [], saved_for_later: [], summary: {...} }
  couponCode: null,
  status: "idle",
  mutationStatus: "idle", // separate flag so a quantity update doesn't blank the whole cart UI
  error: null,
};

export const fetchCart = createAsyncThunk("cart/fetch", async (couponCode, { rejectWithValue }) => {
  try {
    return await cartApi.getCart(couponCode);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load cart."));
  }
});

export const addToCart = createAsyncThunk(
  "cart/addItem",
  async ({ productId, quantity = 1 }, { rejectWithValue }) => {
    try {
      const data = await cartApi.addItem(productId, quantity);
      toast.success("Added to cart.");
      return data;
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to add item to cart.");
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCartItemQuantity = createAsyncThunk(
  "cart/updateQuantity",
  async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
      return await cartApi.updateQuantity(itemId, quantity);
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to update quantity.");
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const removeCartItem = createAsyncThunk("cart/removeItem", async (itemId, { rejectWithValue }) => {
  try {
    const data = await cartApi.removeItem(itemId);
    toast.success("Item removed.");
    return data;
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to remove item.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const saveItemForLater = createAsyncThunk("cart/saveForLater", async (itemId, { rejectWithValue }) => {
  try {
    return await cartApi.saveForLater(itemId);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to save item for later."));
  }
});

export const moveItemToCart = createAsyncThunk("cart/moveToCart", async (itemId, { rejectWithValue }) => {
  try {
    return await cartApi.moveToCart(itemId);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to move item to cart."));
  }
});

export const mergeGuestCart = createAsyncThunk(
  "cart/mergeGuest",
  async (cartToken, { rejectWithValue }) => {
    try {
      return await cartApi.mergeGuestCart(cartToken);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Failed to merge guest cart."));
    }
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    /** Sets the coupon code to preview/apply, then components re-dispatch fetchCart(couponCode). */
    setCouponCode(state, action) {
      state.couponCode = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addMatcher(
        (action) =>
          [addToCart, updateCartItemQuantity, removeCartItem, saveItemForLater, moveItemToCart, mergeGuestCart].some(
            (thunk) => thunk.pending.match(action)
          ),
        (state) => {
          state.mutationStatus = "loading";
        }
      )
      .addMatcher(
        (action) =>
          [addToCart, updateCartItemQuantity, removeCartItem, saveItemForLater, moveItemToCart, mergeGuestCart].some(
            (thunk) => thunk.fulfilled.match(action)
          ),
        (state, action) => {
          state.mutationStatus = "succeeded";
          state.cart = action.payload;
        }
      )
      .addMatcher(
        (action) =>
          [addToCart, updateCartItemQuantity, removeCartItem, saveItemForLater, moveItemToCart, mergeGuestCart].some(
            (thunk) => thunk.rejected.match(action)
          ),
        (state, action) => {
          state.mutationStatus = "failed";
          state.error = action.payload;
        }
      );
  },
});

export const { setCouponCode } = cartSlice.actions;
export default cartSlice.reducer;
