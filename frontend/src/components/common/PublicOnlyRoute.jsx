/**
 * PublicOnlyRoute — the inverse of ProtectedRoute. Prevents an already
 * logged-in user from navigating to /login or /register and seeing a stale
 * form; they're redirected to their profile instead.
 */

import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../constants/routes";
import { FullPageSpinner } from "../ui/Spinner";

export default function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <FullPageSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.PROFILE} replace />;
  }

  return <Outlet />;
}
