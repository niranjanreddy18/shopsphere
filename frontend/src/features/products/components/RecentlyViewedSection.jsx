/**
 * RecentlyViewedSection — shows the shopper's own browsing history (see
 * utils/recentlyViewed.js), excluding the product currently being viewed.
 * Renders nothing until there's at least one other product to show.
 */

import { Link } from "react-router-dom";

import { getRecentlyViewed } from "../../../utils/recentlyViewed";

export default function RecentlyViewedSection({ excludeProductId }) {
  const items = getRecentlyViewed().filter((p) => p.id !== excludeProductId);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="section-heading mb-5 !text-xl">Recently Viewed</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.slug}`}
            className="w-32 shrink-0 rounded-xl border border-ink-100 p-2 transition-shadow hover:shadow-card"
          >
            <div className="aspect-square overflow-hidden rounded-lg bg-ink-50">
              {product.primary_image && (
                <img src={product.primary_image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs text-ink-700">{product.name}</p>
            <p className="text-xs font-semibold text-ink-900">${Number(product.effective_price).toFixed(2)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
