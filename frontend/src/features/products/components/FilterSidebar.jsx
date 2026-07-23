/**
 * FilterSidebar — category/brand/price/stock filters for product listing
 * pages. Fully controlled: it renders whatever `filters` it's given and
 * reports changes via `onChange`, rather than owning any state itself —
 * ProductListingPage is the single source of truth (backed by the URL
 * query string, so filters survive a page refresh/share/back-button).
 */

import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { fetchBrands, fetchCategories } from "../productSlice";

export default function FilterSidebar({ filters, onChange, onClear }) {
  const dispatch = useAppDispatch();
  const categories = useAppSelector((state) => state.products.categories.items);
  const brands = useAppSelector((state) => state.products.brands.items);

  const [priceInputs, setPriceInputs] = useState({
    min_price: filters.min_price || "",
    max_price: filters.max_price || "",
  });

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchBrands());
  }, [dispatch]);

  const applyPriceFilter = () => {
    onChange({ min_price: priceInputs.min_price || undefined, max_price: priceInputs.max_price || undefined });
  };

  return (
    <aside className="card h-fit space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Filters</h2>
        <button onClick={onClear} className="text-xs font-medium text-brand-600 hover:text-brand-700">
          Clear all
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700">Category</h3>
        <div className="space-y-1">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="radio"
                name="category"
                checked={filters.category === category.slug}
                onChange={() => onChange({ category: category.slug })}
                className="text-brand-600 focus:ring-brand-500"
              />
              {category.name}
              <span className="text-xs text-gray-400">({category.product_count})</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700">Brand</h3>
        <div className="space-y-1">
          {brands.map((brand) => (
            <label key={brand.id} className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="radio"
                name="brand"
                checked={filters.brand === brand.slug}
                onChange={() => onChange({ brand: brand.slug })}
                className="text-brand-600 focus:ring-brand-500"
              />
              {brand.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700">Price range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={priceInputs.min_price}
            onChange={(e) => setPriceInputs((p) => ({ ...p, min_price: e.target.value }))}
            className="input-field !mb-0 w-full"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={priceInputs.max_price}
            onChange={(e) => setPriceInputs((p) => ({ ...p, max_price: e.target.value }))}
            className="input-field !mb-0 w-full"
          />
        </div>
        <button onClick={applyPriceFilter} className="btn-secondary mt-2 w-full text-xs">
          Apply
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={filters.in_stock === "true"}
          onChange={(e) => onChange({ in_stock: e.target.checked ? "true" : undefined })}
          className="rounded text-brand-600 focus:ring-brand-500"
        />
        In stock only
      </label>
    </aside>
  );
}
