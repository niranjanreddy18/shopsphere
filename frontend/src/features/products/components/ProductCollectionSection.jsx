/**
 * ProductCollectionSection — a titled row of products with a "View all"
 * link, used three times on the home page (Featured / New Arrivals / Best
 * Sellers). Pulling this into one component means each collection is a
 * one-line usage on HomePage instead of three near-identical blocks.
 */

import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import ProductGrid from "./ProductGrid";

export default function ProductCollectionSection({ title, subtitle, viewAllHref, products, status }) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="section-heading">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
        <Link to={viewAllHref} className="link-underline shrink-0 text-sm font-semibold text-brand-600">
          View all →
        </Link>
      </div>

      <ProductGrid products={products} status={status} emptyMessage="Nothing here yet — check back soon." />
    </section>
  );
}
