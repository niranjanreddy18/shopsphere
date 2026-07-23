/**
 * SortDropdown — maps a friendly label to the backend's `ordering` query
 * param values (see apps/products/views.py's ProductListCreateView
 * docstring for the exact set DRF's OrderingFilter accepts).
 */

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
  { value: "-sold_count", label: "Best Selling" },
  { value: "name", label: "Name: A to Z" },
];

export default function SortDropdown({ value, onChange }) {
  return (
    <select
      value={value || "-created_at"}
      onChange={(e) => onChange(e.target.value)}
      className="input-field !mb-0 w-auto"
      aria-label="Sort products"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
