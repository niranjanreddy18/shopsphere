/**
 * Order slice — owns checkout submission state, the customer's order
 * history list, and the currently-viewed order detail.
 *
 * Kept in Redux (unlike the admin "Manage X" screens, which use local
 * component state — see the README's Admin Dashboard Architecture section
 * for that trade-off) because order state is read from multiple places at
 * once: OrderHistoryPage, OrderDetailPage, and OrderSuccessPage all need a
 * consistent view of "the order that was just placed" without re-fetching
 * it redundantly.
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

import { ordersApi } from "../../api/ordersApi";
import { extractErrorMessage } from "../../utils/apiErrors";

const initialState = {
  history: { results: [], count: 0, totalPages: 0, status: "idle" },
  currentOrder: null,
  currentOrderStatus: "idle",
  checkoutStatus: "idle",
  error: null,
};

export const placeOrder = createAsyncThunk("orders/checkout", async (payload, { rejectWithValue }) => {
  try {
    return await ordersApi.checkout(payload);
  } catch (error) {
    const message = extractErrorMessage(error, "Checkout failed. Please try again.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const fetchOrderHistory = createAsyncThunk("orders/fetchHistory", async (params, { rejectWithValue }) => {
  try {
    return await ordersApi.history(params);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load order history."));
  }
});

export const fetchOrderDetail = createAsyncThunk("orders/fetchDetail", async (id, { rejectWithValue }) => {
  try {
    return await ordersApi.detail(id);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Order not found."));
  }
});

export const cancelOrder = createAsyncThunk("orders/cancel", async ({ id, reason }, { rejectWithValue }) => {
  try {
    const data = await ordersApi.cancel(id, reason);
    toast.success("Order cancelled.");
    return data;
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to cancel order.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    clearCurrentOrder(state) {
      state.currentOrder = null;
      state.currentOrderStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.checkoutStatus = "loading";
        state.error = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.checkoutStatus = "succeeded";
        state.currentOrder = action.payload;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.checkoutStatus = "failed";
        state.error = action.payload;
      })
      .addCase(fetchOrderHistory.pending, (state) => {
        state.history.status = "loading";
      })
      .addCase(fetchOrderHistory.fulfilled, (state, action) => {
        state.history.status = "succeeded";
        state.history.results = action.payload.results;
        state.history.count = action.payload.count;
        state.history.totalPages = action.payload.total_pages;
      })
      .addCase(fetchOrderHistory.rejected, (state, action) => {
        state.history.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchOrderDetail.pending, (state) => {
        state.currentOrderStatus = "loading";
      })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.currentOrderStatus = "succeeded";
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderDetail.rejected, (state, action) => {
        state.currentOrderStatus = "failed";
        state.error = action.payload;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
      });
  },
});

export const { clearCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;
