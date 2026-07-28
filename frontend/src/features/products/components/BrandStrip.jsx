/**
 * BrandStrip — "Shop by brand" row. Brand has no logo imagery in the seed
 * data (see Brand model — a real `logo` ImageField exists for when an
 * admin uploads one via Manage Brands, but nothing seeds it), so unbranded
 * brands render as clean typographic wordmark cards rather than a broken
 * <img> — a deliberate, honest choice over faking logo artwork for brands
 * that don't have one, which would risk looking like real (possibly
 * trademarked) logos that were never actually supplied.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { fetchBrands } from "../productSlice";
import { Skeleton } from "../../../components/ui/Skeleton";

export default function BrandStrip() {
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((state) => state.products.brands);

  useEffect(() => {
    if (status === "idle") dispatch(fetchBrands());
  }, [dispatch, status]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.slice(0, 12).map((brand) =>
        brand.logo ? (
          <Link key={brand.id} to={`/products?brand=${brand.slug}`} className="card card-hover flex h-20 items-center justify-center !p-3">
            <img src={brand.logo} alt={brand.name} className="max-h-10 max-w-full object-contain" />
          </Link>
        ) : (
          <Link
            key={brand.id}
            to={`/products?brand=${brand.slug}`}
            className="card card-hover flex h-20 items-center justify-center !p-3 text-center text-sm font-bold tracking-tight text-ink-600 hover:text-brand-700"
          >
            {brand.name}
          </Link>
        )
      )}
    </div>
  );
}
