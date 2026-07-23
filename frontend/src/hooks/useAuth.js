/**
 * useAuth — convenience hook wrapping the auth slice.
 *
 * Components that only need to know "who is logged in" and "log them out"
 * shouldn't need to know Redux exists. This hook is the single point
 * components use to read auth state, keeping components decoupled from the
 * store's internal shape.
 */

import { useAppSelector } from "../app/store/hooks";

export function useAuth() {
  const { user, isAuthenticated, isInitializing, status, error } = useAppSelector((state) => state.auth);

  return {
    user,
    isAuthenticated,
    isInitializing,
    isLoading: status === "loading",
    error,
    isAdmin: user?.role === "ADMIN",
  };
}
