/**
 * RatingBreakdown — the 5-star-to-1-star distribution bars shown next to
 * the overall average on a product detail page. Computed client-side from
 * the already-fetched review list (no separate aggregate endpoint needed
 * for what's typically a small, single-page list of reviews per product).
 */

import { Star } from "lucide-react";

export default function RatingBreakdown({ reviews, averageRating, reviewCount }) {
  const counts = [5, 4, 3, 2, 1].map((star) => reviews.filter((r) => r.rating === star).length);
  const max = Math.max(...counts, 1);

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="flex shrink-0 flex-col items-center justify-center sm:w-32">
        <span className="text-4xl font-bold text-ink-950">{averageRating?.toFixed(1) ?? "—"}</span>
        <div className="mt-1 flex">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < Math.round(averageRating || 0) ? "fill-amber-400 text-amber-400" : "text-ink-200"}`}
            />
          ))}
        </div>
        <span className="mt-1 text-xs text-ink-500">{reviewCount} review{reviewCount === 1 ? "" : "s"}</span>
      </div>

      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star, i) => (
          <div key={star} className="flex items-center gap-2 text-xs text-ink-500">
            <span className="w-3">{star}</span>
            <Star className="h-3 w-3 fill-ink-300 text-ink-300" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${(counts[i] / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right">{counts[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
