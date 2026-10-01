/**
 * Footer — site-wide footer presenting platform information,
 * features, architecture, and technology stack.
 */

import { Link } from "react-router-dom";

const FEATURES = [
  "Product Discovery",
  "Categories",
  "Search",
  "Cart",
  "Wishlist",
  "Orders",
  "Authentication",
  "Responsive Design",
];

const TECHNOLOGIES = [
  "React + Vite",
  "Django REST Framework",
  "PostgreSQL",
  "Cloudinary",
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-ink-950 text-ink-300">
      <div className="container py-12 lg:py-14">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Column 1 — ShopSphere */}
          <div>
            <Link to="/" className="text-xl font-extrabold tracking-tight text-white">
              Shop<span className="text-brand-400">Sphere</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-ink-400">
              A modern full-stack e-commerce platform built for a seamless online shopping experience.
              Discover products, manage your cart and wishlist, and keep track of your orders through
              a responsive and intuitive interface.
            </p>
          </div>

          {/* Column 2 — Shopping */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wider text-white uppercase">Shopping</h3>
            <p className="text-sm leading-relaxed text-ink-400">
              Browse products across multiple categories, explore new arrivals, discover popular
              products, and manage your shopping experience from one place.
            </p>
          </div>

          {/* Column 3 — Platform */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wider text-white uppercase">Platform</h3>
            <p className="text-sm leading-relaxed text-ink-400">
              Built with React, Django REST Framework, PostgreSQL, and Cloudinary, ShopSphere combines
              a responsive frontend with a structured backend and optimized media delivery.
            </p>
          </div>

          {/* Column 4 — Features */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wider text-white uppercase">Features</h3>
            <ul className="space-y-2 text-sm text-ink-400">
              {FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>

          {/* Column 5 — Technology */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wider text-white uppercase">Technology</h3>
            <ul className="space-y-2 text-sm text-ink-400">
              {TECHNOLOGIES.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-12 border-t border-ink-800 pt-8 text-center">
          <p className="text-xs text-ink-500">
            © 2026 ShopSphere. Built as a full-stack e-commerce platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
