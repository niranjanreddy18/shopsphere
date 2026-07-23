/**
 * Redux store configuration.
 *
 * Uses Redux Toolkit's `configureStore`, which wires up the Redux DevTools
 * extension and a sane default middleware stack (including
 * redux-thunk, used by every async thunk in this project) with no manual
 * setup required.
 *
 * Feature slices are combined here as the single integration point — an
 * individual slice file never needs to know about any other slice.
 */

import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../../features/auth/authSlice";
import addressReducer from "../../features/auth/addressSlice";
import productReducer from "../../features/products/productSlice";
import cartReducer from "../../features/cart/cartSlice";
import wishlistReducer from "../../features/wishlist/wishlistSlice";
import orderReducer from "../../features/orders/orderSlice";
import notificationReducer from "../../features/notifications/notificationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    address: addressReducer,
    products: productReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    orders: orderReducer,
    notifications: notificationReducer,
  },
});

export default store;
