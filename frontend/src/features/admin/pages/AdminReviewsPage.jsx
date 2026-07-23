/** AdminReviewsPage — moderate customer reviews: approve/hide or delete. */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { adminReviewsApi } from "../../../api/adminApi";
import { Skeleton } from "../../../components/ui/Skeleton";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = () => {
    setStatus("loading");
    adminReviewsApi
      .list()
      .then((data) => {
        setReviews(data.results ?? data);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(load, []);

  const handleToggleApproval = async (review) => {
    await adminReviewsApi.setApproval(review.id, !review.is_approved);
    toast.success(review.is_approved ? "Review hidden." : "Review approved.");
    load();
  };

  const handleDelete = async (review) => {
    if (!window.confirm("Delete this review permanently?")) return;
    await adminReviewsApi.remove(review.id);
    toast.success("Review deleted.");
    load();
  };

  if (status === "loading") return <Skeleton className="h-64 w-full" />;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Manage Reviews</h1>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews yet.</p>
      ) : (
        <div className="card divide-y divide-gray-50">
          {reviews.map((review) => (
            <div key={review.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {review.product_name} — {"\u2605".repeat(review.rating)}
                    {"\u2606".repeat(5 - review.rating)}
                  </p>
                  <p className="text-xs text-gray-500">by {review.user_name}</p>
                  {review.comment && <p className="mt-1 text-sm text-gray-700">{review.comment}</p>}
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${review.is_approved ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {review.is_approved ? "Approved" : "Hidden"}
                </span>
              </div>
              <div className="mt-2 text-xs">
                <button onClick={() => handleToggleApproval(review)} className="mr-3 font-medium text-brand-600 hover:underline">
                  {review.is_approved ? "Hide" : "Approve"}
                </button>
                <button onClick={() => handleDelete(review)} className="font-medium text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
