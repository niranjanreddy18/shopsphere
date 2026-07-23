/**
 * WishlistItemCard — product summary + wishlist-specific actions (remove,
 * move to cart). Separate from the generic ProductCard because those
 * actions don't make sense outside the wishlist page context.
 */

import { Link } from "react-router-dom";

import Button from "../../../components/ui/Button";

export default function WishlistItemCard({ item, onRemove, onMoveToCart }) {
  const { product } = item;

  return (
    <div className="card flex gap-4">
      <Link to={`/products/${product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {product.primary_image && (
          <img src={product.primary_image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        )}
      </Link>

      <div className="flex flex-1 flex-col">
        <Link to={`/products/${product.slug}`} className="font-medium text-gray-900 hover:text-brand-600">
          {product.name}
        </Link>
        <p className="mt-1 text-sm text-gray-500">
          ${Number(product.effective_price).toFixed(2)}
          {!product.is_in_stock && <span className="ml-2 text-red-600">Out of stock</span>}
        </p>

        <div className="mt-auto flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="text-xs"
            disabled={!product.is_in_stock}
            onClick={() => onMoveToCart(product.id)}
          >
            Move to cart
          </Button>
          <button
            onClick={() => onRemove(product.id)}
            className="text-xs font-medium text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
