/**
 * QuickViewModal — lets a shopper preview a product (image, price, rating,
 * short description, add to cart) without navigating away from the grid
 * they're browsing — the classic "Quick View" pattern from Amazon/Best
 * Buy-style listings. "View full details" still links to the real product
 * page for the full gallery/specs/reviews.
 */

import { Link } from "react-router-dom";
import { useState } from "react";

import Modal from "../../../components/ui/Modal";
import StarRating from "../../../components/ui/StarRating";
import DeliveryEstimate from "../../../components/ui/DeliveryEstimate";
import Button from "../../../components/ui/Button";
import { useAppDispatch } from "../../../app/store/hooks";
import { addToCart } from "../../cart/cartSlice";

export default function QuickViewModal({ product, isOpen, onClose }) {
  const dispatch = useAppDispatch();
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const handleAddToCart = () => {
    dispatch(addToCart({ productId: product.id, quantity }));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Quick view: ${product.name}`}>
      <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-ink-50">
          {product.primary_image ? (
            <img src={product.primary_image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-300">No image</div>
          )}
        </div>

        <div className="flex flex-col">
          {product.brand_name && (
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{product.brand_name}</p>
          )}
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink-950">{product.name}</h2>

          {product.average_rating !== null && product.average_rating !== undefined && (
            <div className="mt-2">
              <StarRating rating={product.average_rating} reviewCount={product.review_count} />
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <span className="text-2xl font-bold text-ink-950">${Number(product.effective_price).toFixed(2)}</span>
            {product.discount_percentage > 0 && (
              <>
                <span className="text-ink-400 line-through">${Number(product.price).toFixed(2)}</span>
                <span className="badge bg-red-50 text-red-600">-{product.discount_percentage}%</span>
              </>
            )}
          </div>

          <p className="mt-3 text-sm text-ink-500">
            {product.short_description || "A great addition to your collection, backed by our 30-day return policy."}
          </p>

          <div className="mt-4">
            <DeliveryEstimate price={product.effective_price} />
          </div>

          <div className="mt-auto flex items-center gap-3 pt-6">
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              disabled={!product.is_in_stock}
              className="input-field !mb-0 w-20"
              aria-label="Quantity"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <Button onClick={handleAddToCart} disabled={!product.is_in_stock} className="flex-1">
              {product.is_in_stock ? "Add to cart" : "Out of stock"}
            </Button>
          </div>

          <Link
            to={`/products/${product.slug}`}
            onClick={onClose}
            className="link-underline mt-4 text-center text-sm font-medium text-brand-600"
          >
            View full details →
          </Link>
        </div>
      </div>
    </Modal>
  );
}
