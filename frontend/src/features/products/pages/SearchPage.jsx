/**
 * SearchPage — a search box wrapping ProductListingPage. The `search` query
 * param is already forwarded to the backend by ProductListingPage (it
 * spreads every URL param into the fetchProducts call), so this component
 * only needs to own the input box UX; the actual data-fetching path is
 * identical to a filtered listing.
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

import ProductListingPage from "./ProductListingPage";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (query) next.set("search", query);
    else next.delete("search");
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="input-field !mb-0 pl-9"
          />
        </div>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      <ProductListingPage
        key={searchParams.get("search")}
        title={searchParams.get("search") ? `Results for "${searchParams.get("search")}"` : "Search"}
      />
    </div>
  );
}
