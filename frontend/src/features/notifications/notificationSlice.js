/**
 * Notification slice — powers the header notification bell. Small and
 * self-contained: list + unread count + mark-read actions.
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { notificationsApi } from "../../api/notificationsApi";

const initialState = {
  items: [],
  status: "idle",
};

export const fetchNotifications = createAsyncThunk("notifications/fetch", async () => {
  const data = await notificationsApi.list();
  return data.results ?? data;
});

export const markNotificationRead = createAsyncThunk("notifications/markRead", async (id) => {
  return notificationsApi.markRead(id);
});

export const markAllNotificationsRead = createAsyncThunk("notifications/markAllRead", async () => {
  await notificationsApi.markAllRead();
});

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.items.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items = state.items.map((n) => ({ ...n, is_read: true }));
      });
  },
});

export default notificationSlice.reducer;
