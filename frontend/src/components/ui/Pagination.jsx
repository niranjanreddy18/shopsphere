/**
 * Pagination — page-number control used by every paginated listing.
 * Purely presentational/controlled: the parent owns `currentPage` and
 * receives page-change requests via `onPageChange`, so it works identically
 * whether the parent stores the page in Redux, local state, or the URL
 * (ProductListingPage uses the URL — see routes/AppRoutes usage).
 *
 * Shows a condensed window of page numbers (with ellipses) rather than
 * every page, so it stays usable even with hundreds of pages of products.
 */

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = getPageWindow(currentPage, totalPages);

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn-secondary px-3 py-1.5 disabled:opacity-40"
      >
        Prev
      </button>

      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              page === currentPage ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn-secondary px-3 py-1.5 disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}

/** Builds a [1, '...', 4, 5, 6, '...', 20]-style condensed page list. */
function getPageWindow(current, total, siblingCount = 1) {
  const totalNumbers = siblingCount * 2 + 5; // first, last, current, 2 siblings, 2 ellipses-worth
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  const pages = [1];
  if (showLeftEllipsis) pages.push("...");
  for (let p = leftSibling; p <= rightSibling; p++) {
    if (p !== 1 && p !== total) pages.push(p);
  }
  if (showRightEllipsis) pages.push("...");
  pages.push(total);

  return pages;
}
