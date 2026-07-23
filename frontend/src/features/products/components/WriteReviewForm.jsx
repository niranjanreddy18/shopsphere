/**
 * WriteReviewForm — interactive star picker + comment field for
 * submitting a product review. Only rendered for authenticated users who
 * haven't already reviewed this product (unique_together(product, user)
 * on the backend — see apps.reviews.models.Review — would reject a
 * second submission anyway; the parent hides this form proactively once
 * the user's own review is found in the fetched list, so the 400 from a
 * duplicate attempt is a defensive backstop, not the primary UX).
 */

import { useState } from "react";
import { Star } from "lucide-react";

import Button from "../../../components/ui/Button";

export default function WriteReviewForm({ onSubmit, isSubmitting }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setError("");
    onSubmit({ rating, comment });
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3 className="mb-3 font-semibold text-ink-900">Write a review</h3>

      <div className="mb-4 flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }, (_, i) => {
          const value = i + 1;
          const filled = value <= (hoverRating || rating);
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5"
            >
              <Star className={`h-7 w-7 transition-colors ${filled ? "fill-amber-400 text-amber-400" : "text-ink-200"}`} />
            </button>
          );
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with this product (optional)"
        rows={3}
        maxLength={1000}
        className="input-field"
      />

      {error && (
        <p role="alert" className="mb-3 -mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" isLoading={isSubmitting}>
        Submit review
      </Button>
    </form>
  );
}
