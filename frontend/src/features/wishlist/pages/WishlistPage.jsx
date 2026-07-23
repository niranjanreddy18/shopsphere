/**
 * WishlistPage — lists the authenticated user's saved products.
 * Reachable only via ProtectedRoute (see routes/AppRoutes.jsx), so this
 * component can assume `isAuthenticated` is already true.
 */

import { useEffect } from "react";
import { Heart } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { fetchWishlist, moveWishlistItemToCart, removeFromWishlist } from "../wishlistSlice";
import { fetchCart } from "../../cart/cartSlice";
import WishlistItemCard from "../components/WishlistItemCard";
import { ProductGridSkeleton } from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function WishlistPage() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.wishlist);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const handleMoveToCart = async (productId) => {
    const result = await dispatch(moveWishlistItemToCart(productId));
    if (moveWishlistItemToCart.fulfilled.match(result)) {
      dispatch(fetchCart());
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">My Wishlist</h1>

      {status === "loading" && <ProductGridSkeleton count={4} />}

      {status === "failed" && <ErrorMessage message={error} onRetry={() => dispatch(fetchWishlist())} />}

      {status === "succeeded" && items.length === 0 && (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          message="Save products you love here so you can find them again easily."
          actionLabel="Browse products"
          actionHref="/products"
        />
      )}

      {status === "succeeded" && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <WishlistItemCard
              key={item.id}
              item={item}
              onRemove={(productId) => dispatch(removeFromWishlist(productId))}
              onMoveToCart={handleMoveToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
