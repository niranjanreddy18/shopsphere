/**
 * CartItemRow — a single line item in the active cart or the
 * saved-for-later list. `variant` toggles which actions are shown, since
 * saved-for-later items get "Move to cart" instead of quantity controls.
 */

import { Link } from "react-router-dom";

export default function CartItemRow({ item, variant = "active", onQuantityChange, onRemove, onSaveForLater, onMoveToCart }) {
  const { product } = item;

  return (
    <div className="flex gap-4 border-b border-gray-100 py-4 last:border-0">
      <Link to={`/products/${product.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {product.primary_image && (
          <img src={product.primary_image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        )}
      </Link>

      <div className="flex flex-1 flex-col">
        <Link to={`/products/${product.slug}`} className="text-sm font-medium text-gray-900 hover:text-brand-600">
          {product.name}
        </Link>
        <p className="mt-1 text-sm text-gray-500">${Number(product.effective_price).toFixed(2)}</p>

        <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
          {variant === "active" ? (
            <>
              <select
                value={item.quantity}
                onChange={(e) => onQuantityChange(item.id, Number(e.target.value))}
                className="input-field !mb-0 w-16 py-1 text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button onClick={() => onSaveForLater(item.id)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
                Save for later
              </button>
            </>
          ) : (
            <button onClick={() => onMoveToCart(item.id)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Move to cart
            </button>
          )}
          <button onClick={() => onRemove(item.id)} className="text-xs font-medium text-red-600 hover:text-red-700">
            Remove
          </button>
        </div>
      </div>

      <div className="text-sm font-semibold text-gray-900">${Number(item.line_total).toFixed(2)}</div>
    </div>
  );
}
