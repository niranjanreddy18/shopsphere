/**
 * PromoBanners — a row of secondary offer callouts beneath the hero
 * (free shipping threshold, a coupon code, returns policy). Content
 * mirrors what's actually true elsewhere in the app (ShippingService's
 * free-shipping threshold, the WELCOME10 coupon seeded by seed_data,
 * OrderService's cancellation/return window) rather than invented copy.
 */

import { Link } from "react-router-dom";
import { Percent, RotateCcw, Truck } from "lucide-react";

const BANNERS = [
  {
    icon: Truck,
    title: "Free shipping over $50",
    subtitle: "Fast, tracked delivery on every order",
    href: "/shipping",
  },
  {
    icon: Percent,
    title: "10% off your first order",
    subtitle: "Use code WELCOME10 at checkout",
    href: "/products",
  },
  {
    icon: RotateCcw,
    title: "30-day easy returns",
    subtitle: "Not right? Send it back, no questions asked",
    href: "/returns",
  },
];

export default function PromoBanners() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {BANNERS.map(({ icon: Icon, title, subtitle, href }) => (
        <Link
          key={title}
          to={href}
          className="card card-hover flex items-center gap-4 !p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-900">{title}</p>
            <p className="text-xs text-ink-500">{subtitle}</p>
          </div>
        </Link>
      ))}
    </section>
  );
}
