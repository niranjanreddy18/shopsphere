/**
 * ProductListingPage — the shared catalog-browsing page, used directly for
 * "/products" and reused (with a fixed initial filter) by CategoryPage and
 * SearchPage.
 *
 * All filter/sort/page state lives in the URL query string (via
 * useSearchParams) rather than component or Redux state — this means the
 * page is shareable/bookmarkable and survives a refresh or back-button
 * press, which local state alone would lose.
 */

import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { fetchProducts } from "../productSlice";
import ProductGrid from "../components/ProductGrid";
import FilterSidebar from "../components/FilterSidebar";
import SortDropdown from "../components/SortDropdown";
import Pagination from "../../../components/ui/Pagination";
import ErrorMessage from "../../../components/common/ErrorMessage";

/**
 * @param {{ fixedFilters?: Record<string, string>, title?: string }} props
 *   `fixedFilters` — filters baked in by the caller (e.g. CategoryPage
 *   passes { category: 'electronics' }) that aren't shown as removable in
 *   the sidebar, since they ARE the page.
 */
export default function ProductListingPage({ fixedFilters = {}, title = "All Products" }) {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { results, count, totalPages, currentPage, status, error } = useAppSelector(
    (state) => state.products.listing
  );

  const filters = Object.fromEntries(searchParams.entries());
  const page = Number(filters.page) || 1;

  useEffect(() => {
    dispatch(fetchProducts({ ...fixedFilters, ...filters, page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, searchParams.toString()]);

  const updateFilters = (partial) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(partial).forEach(([key, value]) => {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    });
    next.delete("page"); // any filter change resets to page 1
    setSearchParams(next);
  };

  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {status === "succeeded" && <p className="text-sm text-gray-500">{count} products</p>}
        </div>
        <SortDropdown value={filters.ordering} onChange={(ordering) => updateFilters({ ordering })} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <FilterSidebar filters={filters} onChange={updateFilters} onClear={() => setSearchParams({})} />
        </div>

        <div className="md:col-span-3">
          {status === "failed" ? (
            <ErrorMessage
              message={error}
              onRetry={() => dispatch(fetchProducts({ ...fixedFilters, ...filters, page }))}
            />
          ) : (
            <>
              <ProductGrid products={results} status={status} />
              <Pagination currentPage={currentPage || page} totalPages={totalPages} onPageChange={handlePageChange} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
