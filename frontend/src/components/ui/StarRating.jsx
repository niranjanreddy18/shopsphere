/**
 * StarRating — renders a 5-star rating display (filled/half/empty) plus an
 * optional review count, e.g. "★★★★☆ (128)". Purely presentational and
 * used everywhere a rating appears: ProductCard, product detail, review
 * lists, admin review moderation.
 *
 * Accepts `rating = null` (a product with zero reviews) and renders
 * nothing rather than a misleading "0 stars" — see the backend's
 * `average_rating` docstring for why `null` is the "no data" signal, not 0.
 */

import { Star } from "lucide-react";

export default function StarRating({ rating, reviewCount, size = "sm", showCount = true }) {
  if (rating === null || rating === undefined) return null;

  const sizeClasses = { xs: "h-3 w-3", sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };
  const starSize = sizeClasses[size] || sizeClasses.sm;

  return (
    <div className="flex items-center gap-1" role="img" aria-label={`Rated ${rating} out of 5 stars`}>
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => {
          const fillLevel = Math.min(Math.max(rating - i, 0), 1); // 0, fractional, or 1
          return (
            <span key={i} className="relative inline-block">
              <Star className={`${starSize} text-ink-200`} />
              {fillLevel > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillLevel * 100}%` }}>
                  <Star className={`${starSize} fill-amber-400 text-amber-400`} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showCount && reviewCount !== undefined && (
        <span className="text-xs text-ink-500">
          {rating.toFixed(1)} {reviewCount > 0 && `(${reviewCount})`}
        </span>
      )}
    </div>
  );
}
