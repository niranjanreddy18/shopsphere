/**
 * CategoriesDropdown — "Categories" nav item that reveals every top-level
 * category on hover/click, each linking into the existing CategoryPage
 * route. Fetches lazily on first open rather than unconditionally on
 * every Header mount, since most page visits never open this menu.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../app/store/hooks";
import { fetchCategories } from "../../features/products/productSlice";

export default function CategoriesDropdown() {
  const dispatch = useAppDispatch();
  const categories = useAppSelector((state) => state.products.categories);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    if (categories.status === "idle") dispatch(fetchCategories());
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 text-sm font-medium text-ink-700 hover:text-brand-700"
      >
        Categories
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-3 w-64 rounded-xl border border-ink-100 bg-white p-2 shadow-card-hover animate-fade-in">
          {categories.status === "loading" && <p className="px-3 py-2 text-sm text-ink-400">Loading...</p>}
          {categories.items.map((category) => (
            <Link
              key={category.id}
              to={`/categories/${category.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 hover:text-brand-700"
            >
              {category.name}
              <span className="text-xs text-ink-400">{category.product_count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
