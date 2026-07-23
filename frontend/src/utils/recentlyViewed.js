/**
 * Recently-viewed product tracking.
 *
 * Stored client-side (localStorage), not server-side — this is
 * per-browser browsing history, not account data that needs to sync
 * across devices, so there's no real case for a backend endpoint/model
 * here. Keeps only lightweight product summaries (id/slug/name/image/
 * price), not full product objects, and caps the list so it can't grow
 * unbounded over a long browsing session.
 */

const STORAGE_KEY = "ecommerce_recently_viewed";
const MAX_ITEMS = 12;

export function recordProductView(product) {
  const entry = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    primary_image: product.images?.[0]?.image ?? null,
    effective_price: product.effective_price,
  };

  const existing = getRecentlyViewed().filter((p) => p.id !== entry.id);
  const updated = [entry, ...existing].slice(0, MAX_ITEMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage can fail (quota exceeded, private browsing) — recently-viewed
    // is a nice-to-have, never worth surfacing an error for.
  }
}

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
