/**
 * Address slice — manages the authenticated user's shipping/billing
 * addresses. Kept separate from authSlice because addresses are a distinct
 * resource with their own CRUD lifecycle, even though they only make sense
 * in the context of a logged-in user.
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

import { addressApi } from "../../api/addressApi";
import { extractErrorMessage } from "../../utils/apiErrors";

const initialState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchAddresses = createAsyncThunk("address/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const data = await addressApi.list();
    return data.results ?? data; // tolerate both paginated and flat shapes
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load addresses."));
  }
});

export const createAddress = createAsyncThunk("address/create", async (payload, { rejectWithValue }) => {
  try {
    const data = await addressApi.create(payload);
    toast.success("Address added.");
    return data;
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to add address.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const updateAddress = createAsyncThunk(
  "address/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await addressApi.update(id, payload);
      toast.success("Address updated.");
      return data;
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to update address.");
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteAddress = createAsyncThunk("address/delete", async (id, { rejectWithValue }) => {
  try {
    await addressApi.remove(id);
    toast.success("Address removed.");
    return id;
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to remove address.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const setDefaultAddress = createAsyncThunk("address/setDefault", async (id, { rejectWithValue }) => {
  try {
    const data = await addressApi.setDefault(id);
    return data;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to set default address."));
  }
});

const addressSlice = createSlice({
  name: "address",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        const index = state.items.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.items = state.items.filter((a) => a.id !== action.payload);
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        // Mirror the backend's "one default per type" invariant locally so
        // the UI updates immediately without waiting for a full re-fetch.
        state.items = state.items.map((a) =>
          a.address_type === action.payload.address_type
            ? { ...a, is_default: a.id === action.payload.id }
            : a
        );
      });
  },
});

export default addressSlice.reducer;
