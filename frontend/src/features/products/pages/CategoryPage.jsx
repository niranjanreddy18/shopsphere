/**
 * CategoryPage — thin wrapper around ProductListingPage that pins the
 * `category` filter to the slug from the URL (/categories/:slug).
 */

import { useParams } from "react-router-dom";

import ProductListingPage from "./ProductListingPage";

export default function CategoryPage() {
  const { slug } = useParams();

  return (
    <ProductListingPage
      key={slug} // remounts the listing (and resets its own filter state) when the category changes
      fixedFilters={{ category: slug }}
      title={slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    />
  );
}
