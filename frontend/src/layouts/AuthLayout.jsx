/**
 * AuthLayout — modern split-screen shell for every authentication page
 * (login, register, forgot/reset password, email verification). A large
 * branded panel with a real lifestyle photo occupies the left half on
 * larger screens (the "professional illustration" a premium auth page
 * needs), collapsing to a compact top banner on mobile so the form stays
 * the primary focus there. Kept separate from MainLayout because auth
 * pages intentionally omit the main site navigation to keep the user's
 * attention on the form.
 */

import { Link, Outlet } from "react-router-dom";
import { ShieldCheck, Truck, Undo2 } from "lucide-react";

import { ROUTES } from "../constants/routes";

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Secure checkout, every time" },
  { icon: Truck, text: "Fast, tracked shipping" },
  { icon: Undo2, text: "30-day hassle-free returns" },
];

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* --- Branding panel ------------------------------------------------ */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <img
          src="https://loremflickr.com/1000/1400/shopping,retail?lock=90210"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to={ROUTES.HOME} className="text-2xl font-extrabold tracking-tight text-white">
            Shop<span className="text-brand-400">Sphere</span>
          </Link>

          <div>
            <h2 className="max-w-sm text-3xl font-bold leading-tight text-white">
              Everything you need, delivered beautifully.
            </h2>
            <ul className="mt-8 space-y-4">
              {TRUST_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-ink-200">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* --- Form panel --------------------------------------------------- */}
      <div className="flex items-center justify-center bg-white px-4 py-12 sm:px-6">
        <div className="w-full max-w-md animate-fade-in">
          <Link to={ROUTES.HOME} className="mb-8 block text-center text-2xl font-extrabold tracking-tight text-ink-950 lg:hidden">
            Shop<span className="text-brand-600">Sphere</span>
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
