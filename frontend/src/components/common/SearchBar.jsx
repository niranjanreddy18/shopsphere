/**
 * SearchBar — the header's inline search input. Submitting navigates to
 * /search?search=<query>, the same query param SearchPage/ProductListingPage
 * already read (see features/products/pages/SearchPage.jsx) — this is
 * deliberately just a second entry point into that existing flow, not a
 * separate search implementation.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

export default function SearchBar({ className = "" }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/search?search=${encodeURIComponent(query.trim())}` : "/search");
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`} role="search">
      <label htmlFor="header-search" className="sr-only">Search products</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        id="header-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products, brands, categories..."
        className="w-full rounded-full border border-ink-200 bg-ink-50 py-2.5 pl-10 pr-4 text-sm text-ink-900
                   placeholder:text-ink-400 transition-colors focus:border-brand-500 focus:bg-white
                   focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </form>
  );
}
