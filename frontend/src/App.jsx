/**
 * App — root component.
 *
 * Responsibilities:
 *  - Bootstraps the session on first load: if a token exists in
 *    localStorage, fetch the user's profile once so the app knows who's
 *    logged in before rendering any protected content (see authSlice's
 *    isInitializing flag, consumed by ProtectedRoute/PublicOnlyRoute).
 *  - Loads the cart on every load (guest or logged-in — cartApi handles
 *    the distinction transparently via the X-Cart-Token header) and the
 *    wishlist once a session is confirmed authenticated.
 *  - Merges a guest cart into the user's persistent cart the moment a
 *    session transitions from logged-out to logged-in, so items added
 *    before signing in aren't lost.
 *  - Hosts the global <Toaster /> so any thunk anywhere in the app can call
 *    react-hot-toast's toast.success()/toast.error() without each page
 *    needing its own toast container.
 *  - Renders the route tree (see routes/AppRoutes.jsx).
 */

import { useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";

import { useAppDispatch, useAppSelector } from "./app/store/hooks";
import { fetchProfile } from "./features/auth/authSlice";
import { fetchCart, mergeGuestCart } from "./features/cart/cartSlice";
import { fetchWishlist } from "./features/wishlist/wishlistSlice";
import { getAccessToken } from "./utils/tokenStorage";
import { clearCartToken, getCartToken } from "./utils/cartToken";
import AppRoutes from "./routes/AppRoutes";

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isInitializing } = useAppSelector((state) => state.auth);
  const wasAuthenticated = useRef(false);
  const hasInitializedAuth = useRef(false);

  // Initial bootstrap: resolve the session if an access token exists.
  useEffect(() => {
    if (getAccessToken()) {
      dispatch(fetchProfile());
    }
  }, [dispatch]);

  // Handles cart and wishlist initialization and session transitions:
  // - On initial startup: once auth initialization settles (or immediately for guests),
  //   load the appropriate cart (or merge guest cart) and wishlist exactly once.
  // - On login transition: merge guest cart or fetch user cart, and load wishlist.
  // - On logout transition: load a fresh guest cart.
  useEffect(() => {
    if (isInitializing) return;

    if (!hasInitializedAuth.current) {
      hasInitializedAuth.current = true;
      wasAuthenticated.current = isAuthenticated;

      if (isAuthenticated) {
        const guestToken = getCartToken();
        if (guestToken) {
          dispatch(mergeGuestCart(guestToken)).then(() => clearCartToken());
        } else {
          dispatch(fetchCart());
        }
        dispatch(fetchWishlist());
      } else {
        dispatch(fetchCart());
      }
      return;
    }

    // Subsequent transitions after initial startup:
    if (isAuthenticated && !wasAuthenticated.current) {
      const guestToken = getCartToken();
      if (guestToken) {
        dispatch(mergeGuestCart(guestToken)).then(() => clearCartToken());
      } else {
        dispatch(fetchCart());
      }
      dispatch(fetchWishlist());
    } else if (!isAuthenticated && wasAuthenticated.current) {
      dispatch(fetchCart());
    }

    wasAuthenticated.current = isAuthenticated;
  }, [dispatch, isAuthenticated, isInitializing]);

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <AppRoutes />
    </>
  );
}

export default App;
