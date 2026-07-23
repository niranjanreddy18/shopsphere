/**
 * Skeleton — generic pulsing placeholder block. Composed into more specific
 * skeletons (ProductCardSkeleton, ProductDetailSkeleton, etc.) rather than
 * each screen hand-rolling its own shimmer markup.
 */

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card p-3">
      <Skeleton className="mb-3 aspect-square w-full" />
      <Skeleton className="mb-2 h-4 w-3/4" />
      <Skeleton className="mb-2 h-4 w-1/2" />
      <Skeleton className="h-5 w-1/3" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Skeleton className="aspect-square w-full" />
      <div>
        <Skeleton className="mb-4 h-8 w-3/4" />
        <Skeleton className="mb-2 h-4 w-1/4" />
        <Skeleton className="mb-6 h-6 w-1/3" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-6 h-4 w-2/3" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 border-b border-gray-100 py-4">
      <Skeleton className="h-20 w-20 shrink-0" />
      <div className="flex-1">
        <Skeleton className="mb-2 h-4 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}
