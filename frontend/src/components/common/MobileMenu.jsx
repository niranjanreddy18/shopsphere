/**
 * MobileMenu — slide-out drawer for small screens, holding the nav links
 * that the desktop header shows inline (Products/Search/Orders/Admin) plus
 * account actions. The desktop header hides these behind `sm:flex` — on
 * mobile they need an explicit entry point instead of simply disappearing,
 * which was a real gap in the previous header (no hamburger menu at all).
 */

import { Link } from "react-router-dom";
import { LayoutDashboard, LogOut, User, X } from "lucide-react";

import { ROUTES } from "../../constants/routes";

export default function MobileMenu({ isOpen, onClose, isAuthenticated, isAdmin, onLogout }) {
  if (!isOpen) return null;

  const linkClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50";

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-0 h-full w-72 animate-slide-up bg-white p-4 shadow-card-hover">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-bold text-ink-950">Menu</span>
          <button onClick={onClose} aria-label="Close menu" className="rounded-full p-1.5 hover:bg-ink-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          <Link to="/products" onClick={onClose} className={linkClass}>Products</Link>
          <Link to="/search" onClick={onClose} className={linkClass}>Search</Link>
          {isAuthenticated && <Link to="/orders" onClick={onClose} className={linkClass}>Orders</Link>}
          {isAuthenticated && <Link to="/wishlist" onClick={onClose} className={linkClass}>Wishlist</Link>}
          {isAdmin && (
            <Link to="/admin" onClick={onClose} className={linkClass}>
              <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
            </Link>
          )}

          <div className="my-2 border-t border-ink-100" />

          {isAuthenticated ? (
            <>
              <Link to={ROUTES.PROFILE} onClick={onClose} className={linkClass}>
                <User className="h-4 w-4" /> Profile
              </Link>
              <button
                onClick={() => { onClose(); onLogout(); }}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} onClick={onClose} className={linkClass}>Login</Link>
              <Link to={ROUTES.REGISTER} onClick={onClose} className="btn-primary mt-1 justify-center">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
