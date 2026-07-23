/**
 * ProductCard — the single reusable product tile used by every grid in the
 * app (listing, category, search, home page carousels, related products).
 *
 * Redesigned for a premium retail feel (Amazon/Best Buy-style density):
 * discount badge, brand, star rating + review count, current/original
 * price, stock status, a delivery estimate, and a hover-revealed Quick
 * View action alongside the wishlist toggle — while keeping the exact
 * same `product` prop shape every caller already passes in.
 *
 * Image uses native `loading="lazy"` (rather than a JS intersection
 * observer library) — every modern evergreen browser supports it, and it's
 * zero extra bundle weight for what is otherwise a solved problem.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Heart } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { useAuth } from "../../../hooks/useAuth";
import { addToCart } from "../../cart/cartSlice";
import { addToWishlist, removeFromWishlist } from "../../wishlist/wishlistSlice";
import StarRating from "../../../components/ui/StarRating";
import DeliveryEstimate from "../../../components/ui/DeliveryEstimate";
import QuickViewModal from "./QuickViewModal";

export default function ProductCard({ product }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const wishlistItems = useAppSelector((state) => state.wishlist.items);
  const isWishlisted = wishlistItems.some((item) => item.product.id === product.id);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    dispatch(addToCart({ productId: product.id, quantity: 1 }));
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return; // Header already prompts sign-in; icon is simply inert for guests.
    if (isWishlisted) {
      dispatch(removeFromWishlist(product.id));
    } else {
      dispatch(addToWishlist(product.id));
    }
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    setIsQuickViewOpen(true);
  };

  return (
    <>
      <Link
        to={`/products/${product.slug}`}
        className="card card-hover group relative flex flex-col overflow-hidden p-0"
      >
        {/* --- Image + floating badges/actions ------------------------- */}
        <div className="relative aspect-square w-full overflow-hidden bg-ink-50">
          {product.primary_image ? (
            <img
              src={product.primary_image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-ink-300">No image</div>
          )}

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.discount_percentage > 0 && (
              <span className="badge bg-red-600 text-white shadow-sm">-{product.discount_percentage}%</span>
            )}
            {product.is_featured && (
              <span className="badge bg-ink-950/90 text-white shadow-sm">Featured</span>
            )}
          </div>

          {isAuthenticated && (
            <button
              onClick={handleToggleWishlist}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={isWishlisted}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/95 p-2 shadow-sm transition-transform hover:scale-110"
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? "fill-red-500 text-red-500" : "text-ink-400"}`} />
            </button>
          )}

          {/* Quick View — revealed on hover (desktop) so the grid stays
              clean at rest; always tappable on touch devices since
              hover-only actions are otherwise unreachable there. */}
          <button
            onClick={handleQuickView}
            className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-center gap-1.5 rounded-full
                       bg-white/95 py-2 text-xs font-semibold text-ink-800 opacity-0 shadow-sm backdrop-blur
                       transition-all duration-200 hover:bg-white group-hover:opacity-100 sm:translate-y-2
                       sm:group-hover:translate-y-0"
          >
            <Eye className="h-3.5 w-3.5" /> Quick View
          </button>

          {!product.is_in_stock && (
            <span className="absolute inset-x-0 bottom-0 bg-ink-950/85 py-1.5 text-center text-xs font-medium text-white">
              Out of stock
            </span>
          )}
        </div>

        {/* --- Details ---------------------------------------------------- */}
        <div className="flex flex-1 flex-col gap-1 p-4">
          {product.brand_name && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{product.brand_name}</p>
          )}
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">{product.name}</h3>

          <StarRating rating={product.average_rating} reviewCount={product.review_count} size="xs" />

          <div className="mt-1 flex items-center gap-2">
            <span className="text-base font-bold text-ink-950">${Number(product.effective_price).toFixed(2)}</span>
            {product.discount_percentage > 0 && (
              <span className="text-xs text-ink-400 line-through">${Number(product.price).toFixed(2)}</span>
            )}
          </div>

          {product.is_in_stock && (
            <>
              {product.is_low_stock && <p className="text-xs font-medium text-amber-600">Only a few left</p>}
              <DeliveryEstimate price={product.effective_price} compact />
            </>
          )}

          <button
            onClick={handleAddToCart}
            disabled={!product.is_in_stock}
            className="btn-dark mt-3 w-full py-2 text-xs disabled:bg-ink-200 disabled:text-ink-400"
          >
            {product.is_in_stock ? "Add to Cart" : "Unavailable"}
          </button>
        </div>
      </Link>

      <QuickViewModal product={product} isOpen={isQuickViewOpen} onClose={() => setIsQuickViewOpen(false)} />
    </>
  );
}
