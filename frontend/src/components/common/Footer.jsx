/**
 * Footer — full site footer: brand blurb + newsletter, Company/Support/
 * Legal link columns, social links, and payment-method badges. Rendered
 * once via MainLayout, shown on every page.
 */

import { Link } from "react-router-dom";

import NewsletterForm from "./NewsletterForm";

const LINK_COLUMNS = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Sustainability", href: "/sustainability" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Track Order", href: "/orders" },
      { label: "Returns & Refunds", href: "/returns" },
      { label: "Shipping Info", href: "/shipping" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: "Facebook", short: "f", href: "https://facebook.com" },
  { label: "Instagram", short: "IG", href: "https://instagram.com" },
  { label: "X (Twitter)", short: "X", href: "https://x.com" },
  { label: "YouTube", short: "YT", href: "https://youtube.com" },
];

const PAYMENT_METHODS = ["Visa", "Mastercard", "Amex", "PayPal", "Apple Pay"];

export default function Footer() {
  return (
    <footer className="mt-auto bg-ink-950 text-ink-300">
      <div className="container py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
            <Link to="/" className="text-xl font-extrabold tracking-tight text-white">
              Shop<span className="text-brand-400">Sphere</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-400">
              Quality products, fair prices, and fast shipping — a full-stack storefront
              built to demonstrate production-grade engineering practice end to end.
            </p>
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-white">Get exclusive offers</p>
              <NewsletterForm />
            </div>
          </div>

          {LINK_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-sm font-semibold text-white">{column.title}</h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-ink-400 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-ink-800 pt-8 sm:flex-row">
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map(({ label, short, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-ink-300 transition-colors hover:bg-brand-600 hover:text-white"
              >
                {short}
              </a>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {PAYMENT_METHODS.map((method) => (
              <span key={method} className="rounded-md border border-ink-700 bg-ink-900 px-2.5 py-1 text-xs font-medium text-ink-300">
                {method}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-ink-500">
          © {new Date().getFullYear()} ShopSphere. Built as a full-stack engineering portfolio project.
        </p>
      </div>
    </footer>
  );
}
