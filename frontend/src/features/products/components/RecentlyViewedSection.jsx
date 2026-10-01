/**
 * RecentlyViewedSection — shows the authenticated shopper's server-side
 * browsing history, excluding the product currently being viewed.
 * Renders nothing until there's at least one other product to show.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { productsApi } from "../../../api/productsApi";

export default function RecentlyViewedSection({ excludeProductId, authenticated, refreshKey }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!authenticated || refreshKey === 0) {
      setItems([]);
      return;
    }

    let ignore = false;
    productsApi.recentlyViewed()
      .then((response) => {
        if (!ignore) setItems(response.results ?? response);
      })
      .catch(() => {
        if (!ignore) setItems([]);
      });

    return () => {
      ignore = true;
    };
  }, [authenticated, refreshKey]);

  const visibleItems = items.filter((product) => product.id !== excludeProductId);

  if (visibleItems.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="section-heading mb-5 !text-xl">Recently Viewed</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {visibleItems.map((product) => (
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
