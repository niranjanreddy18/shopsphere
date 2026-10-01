/**
 * AuthLayout — clean, centered card shell for authentication pages
 * (login, register, forgot/reset password, email verification).
 * Form stays the primary focus centered on the screen without side banners.
 */

import { Link, Outlet } from "react-router-dom";

import { ROUTES } from "../constants/routes";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md animate-fade-in rounded-2xl border border-ink-100 bg-white p-8 shadow-card sm:p-10">
        <Link to={ROUTES.HOME} className="mb-8 block text-center text-3xl font-extrabold tracking-tight text-ink-950">
          Shop<span className="text-brand-600">Sphere</span>
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
