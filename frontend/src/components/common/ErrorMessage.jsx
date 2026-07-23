/**
 * ErrorMessage — inline display for expected/handled failures (a failed
 * fetch, a 404 product, an empty coupon validation). Used inside a page's
 * normal layout rather than replacing it, so the rest of the page (header,
 * filters, etc.) stays usable.
 */

import Button from "../ui/Button";

export default function ErrorMessage({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="card text-center">
      <p className="mb-4 text-sm text-gray-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
