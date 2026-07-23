/**
 * ProtectedRoute — guards nested routes behind authentication (and
 * optionally, a specific role).
 *
 * Renders <FullPageSpinner /> while the initial session check is still in
 * flight (see authSlice's isInitializing), so a hard page refresh never
 * bounces a genuinely-logged-in user to /login before we've had a chance to
 * confirm their token is still valid.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>...</Route>                 // any authenticated user
 *   <Route element={<ProtectedRoute requiredRole="ADMIN" />}>...</Route>  // admins only
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../constants/routes";
import { FullPageSpinner } from "../ui/Spinner";

export default function ProtectedRoute({ requiredRole }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    // `state.from` lets the login page redirect back to whatever the user
    // originally tried to reach, instead of always dropping them at "/".
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}
