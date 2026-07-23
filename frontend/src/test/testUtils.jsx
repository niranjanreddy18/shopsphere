/**
 * renderWithProviders — wraps a component under test with the same
 * Provider/BrowserRouter shell it gets at runtime (see main.jsx), so
 * components that call useAppSelector/useAppDispatch or routing hooks
 * (useNavigate, <Link>, etc.) work in tests without every test file
 * re-implementing this boilerplate.
 *
 * Accepts a `preloadedState` so each test can seed only the slice of state
 * it cares about, rather than needing a fully realistic store.
 */

import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";

import authReducer from "../features/auth/authSlice";
import addressReducer from "../features/auth/addressSlice";
import productReducer from "../features/products/productSlice";
import cartReducer from "../features/cart/cartSlice";
import wishlistReducer from "../features/wishlist/wishlistSlice";
import orderReducer from "../features/orders/orderSlice";
import notificationReducer from "../features/notifications/notificationSlice";

export function renderWithProviders(ui, { preloadedState = {}, route = "/" } = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      address: addressReducer,
      products: productReducer,
      cart: cartReducer,
      wishlist: wishlistReducer,
      orders: orderReducer,
      notifications: notificationReducer,
    },
    preloadedState,
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>
    ),
  };
}
