/**
 * ProductReviewsSection — the product detail page's full "Customer
 * Reviews" block: rating breakdown, the review list, and a write-review
 * form for eligible signed-in shoppers. Keeps its own local fetch/state
 * (not a Redux slice) since review data for one product page is read
 * once, by exactly this one screen — the same "local state for
 * single-screen data" reasoning already established for the admin Manage
 * screens (see README's Admin Dashboard Architecture section).
 */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { reviewsApi } from "../../../api/reviewsApi";
import { useAuth } from "../../../hooks/useAuth";
import StarRating from "../../../components/ui/StarRating";
import { Skeleton } from "../../../components/ui/Skeleton";
import RatingBreakdown from "./RatingBreakdown";
import WriteReviewForm from "./WriteReviewForm";

export default function ProductReviewsSection({ productId, averageRating, reviewCount }) {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReviews = () => {
    setStatus("loading");
    reviewsApi
      .listForProduct(productId)
      .then((data) => {
        setReviews(data.results ?? data);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const hasReviewed = isAuthenticated && reviews.some((r) => r.user === user?.id);

  const handleSubmitReview = async ({ rating, comment }) => {
    setIsSubmitting(true);
    try {
      await reviewsApi.create(productId, rating, comment);
      toast.success("Thanks for your review!");
      loadReviews();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold tracking-tight text-ink-950">Customer Reviews</h2>

      {status === "loading" && <Skeleton className="h-24 w-full" />}

      {status === "succeeded" && (
        <>
          {reviews.length > 0 ? (
            <div className="card mb-6">
              <RatingBreakdown reviews={reviews} averageRating={averageRating} reviewCount={reviewCount} />
            </div>
          ) : (
            <p className="mb-6 text-sm text-ink-500">No reviews yet — be the first to share your thoughts.</p>
          )}

          {isAuthenticated && !hasReviewed && (
            <div className="mb-6">
              <WriteReviewForm onSubmit={handleSubmitReview} isSubmitting={isSubmitting} />
            </div>
          )}

          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="card !shadow-none border-ink-100">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-900">{review.user_name}</span>
                  <span className="text-xs text-ink-400">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <StarRating rating={review.rating} showCount={false} size="xs" />
                {review.comment && <p className="mt-2 text-sm leading-relaxed text-ink-600">{review.comment}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
