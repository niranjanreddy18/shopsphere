/**
 * Header — sticky top navigation: brand, categories dropdown, inline
 * search, and auth-aware controls (notification bell, wishlist/cart icons
 * with live counts, profile dropdown). Shows an "Admin" link only for
 * ADMIN-role users — see the file-level note in the previous
 * implementation: this is a UX courtesy only, every admin route/endpoint
 * is independently protected server-side regardless of link visibility.
 *
 * `sticky top-0` + a backdrop blur keeps the header reachable while
 * scrolling a long product listing — standard premium-retail behavior
 * (every site named in this redesign brief does this).
 */

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Heart, LayoutDashboard, LogOut, Menu, Package, ShoppingCart, User } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../../app/store/hooks";
import { logoutUser } from "../../features/auth/authSlice";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../../features/notifications/notificationSlice";
import { ROUTES } from "../../constants/routes";
import SearchBar from "./SearchBar";
import CategoriesDropdown from "./CategoriesDropdown";
import MobileMenu from "./MobileMenu";

function NotificationBell() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.notifications.items);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unreadCount = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-ink-600 hover:bg-ink-100"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 animate-fade-in rounded-xl border border-ink-100 bg-white shadow-card-hover">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <span className="text-sm font-semibold text-ink-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={() => dispatch(markAllNotificationsRead())} className="text-xs font-medium text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">No notifications yet.</p>
            ) : (
              items.slice(0, 10).map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && dispatch(markNotificationRead(n.id))}
                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-ink-50 ${!n.is_read ? "bg-brand-50/60" : ""}`}
                >
                  <p className="font-medium text-ink-900">{n.title}</p>
                  <p className="text-xs text-ink-500">{n.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-ink-700 hover:bg-ink-100"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          {user?.first_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
        </span>
        {user?.first_name || "Account"}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-52 animate-fade-in rounded-xl border border-ink-100 bg-white p-1.5 shadow-card-hover">
          <Link to={ROUTES.PROFILE} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
            <User className="h-4 w-4" /> Profile
          </Link>
          <Link to="/orders" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
            <Package className="h-4 w-4" /> Orders
          </Link>
          <div className="my-1 border-t border-ink-100" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cart = useAppSelector((state) => state.cart.cart);
  const wishlistCount = useAppSelector((state) => state.wishlist.items.length);
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur-md">
      <div className="container flex h-16 items-center gap-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 sm:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to={ROUTES.HOME} className="shrink-0 text-xl font-extrabold tracking-tight text-ink-950">
          Shop<span className="text-brand-600">Sphere</span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          <CategoriesDropdown />
          <Link to="/products" className="text-sm font-medium text-ink-700 hover:text-brand-700">Products</Link>
          {isAuthenticated && <Link to="/orders" className="text-sm font-medium text-ink-700 hover:text-brand-700">Orders</Link>}
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1 text-sm font-medium text-ink-700 hover:text-brand-700">
              <LayoutDashboard className="h-4 w-4" /> Admin
            </Link>
          )}
        </div>

        <SearchBar className="ml-auto hidden max-w-md flex-1 lg:block" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-4">
          {isAuthenticated && <NotificationBell />}

          {isAuthenticated && (
            <Link to="/wishlist" className="relative rounded-full p-2 text-ink-600 hover:bg-ink-100" aria-label={`Wishlist${wishlistCount ? ` (${wishlistCount} items)` : ""}`}>
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>
          )}

          <Link to="/cart" className="relative rounded-full p-2 text-ink-600 hover:bg-ink-100" aria-label={`Cart${cartItemCount ? ` (${cartItemCount} items)` : ""}`}>
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                {cartItemCount > 9 ? "9+" : cartItemCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <ProfileMenu user={user} onLogout={handleLogout} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to={ROUTES.LOGIN} className="btn-ghost">Login</Link>
              <Link to={ROUTES.REGISTER} className="btn-dark">Sign Up</Link>
            </div>
          )}
        </div>
      </div>

      {/* Search bar collapses to full-width below the main row on smaller screens. */}
      <div className="container pb-3 lg:hidden">
        <SearchBar />
      </div>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />
    </header>
  );
}
