/**
 * CategoryGrid — homepage category cards, each a photo tile linking into
 * the existing CategoryPage route. Fetches the real category list (with
 * live product counts) rather than a hardcoded list, so it reflects
 * whatever an admin has actually configured via Manage Categories.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { fetchCategories } from "../productSlice";
import { Skeleton } from "../../../components/ui/Skeleton";

export default function CategoryGrid() {
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((state) => state.products.categories);

  useEffect(() => {
    if (status === "idle") dispatch(fetchCategories());
  }, [dispatch, status]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="grid grid-cols-5 gap-2 text-center sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 sm:gap-2">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="h-3 w-full rounded-full sm:hidden" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2 text-center sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
      {items.slice(0, 15).map((category, index) => (
        <Link
          key={category.id}
          to={`/categories/${category.slug}`}
          className={`group flex-col items-center gap-1 sm:gap-2 text-center ${
            index >= 10 ? "hidden sm:flex" : "flex"
          }`}
        >
          <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-ink-100 shadow-card transition-shadow group-hover:shadow-card-hover">
            <img
              src={category.image || "/images/categories/Smartphones.jpg"}
              alt={category.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent" />
          </span>
          <span className="truncate text-[10px] font-medium text-ink-700 group-hover:text-brand-700 sm:overflow-visible sm:whitespace-normal sm:text-xs md:text-sm">
            {category.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
