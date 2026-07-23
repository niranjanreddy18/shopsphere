/**
 * TestimonialSection — homepage "Customer Reviews" showcase, backed by the
 * real `/reviews/testimonials/` endpoint (top-rated, commented, approved
 * reviews — see apps.reviews.views.TestimonialReviewListView) rather than
 * invented quotes. Renders nothing if the store has no qualifying reviews
 * yet, instead of showing an empty/awkward section.
 */

import { useEffect, useState } from "react";

import { reviewsApi } from "../../../api/reviewsApi";
import StarRating from "../../../components/ui/StarRating";
import { Skeleton } from "../../../components/ui/Skeleton";

export default function TestimonialSection() {
  const [testimonials, setTestimonials] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    reviewsApi
      .testimonials()
      .then((data) => {
        setTestimonials(data);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  }, []);

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (status === "failed" || testimonials.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {testimonials.slice(0, 6).map((review) => (
        <figure key={review.id} className="card flex flex-col">
          <StarRating rating={review.rating} showCount={false} size="sm" />
          <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">
            "{review.comment}"
          </blockquote>
          <figcaption className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
            <span className="font-semibold text-ink-800">{review.user_name}</span> · verified purchase of{" "}
            <span className="text-ink-600">{review.product_name}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
