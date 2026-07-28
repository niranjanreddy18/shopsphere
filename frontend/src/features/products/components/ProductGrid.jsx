/**
 * ProductGrid — renders a list of products, or the appropriate
 * loading/empty state. Centralising this means every page that shows a
 * grid of products (listing, category, search, curated collections) gets
 * identical skeleton/empty behaviour for free.
 */

import { SearchX } from "lucide-react";

import { ProductGridSkeleton } from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products, status, emptyMessage = "No products found." }) {
  if (status === "loading") {
    return <ProductGridSkeleton />;
  }

  if (status === "succeeded" && products.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No products found"
        message={emptyMessage === "No products found." ? "Try adjusting your filters or search terms." : emptyMessage}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
