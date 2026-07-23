/**
 * CartPage — works identically for guest and logged-in users; the only
 * difference (which cart the backend resolves to) is handled entirely by
 * cartApi's X-Cart-Token header logic, so this component doesn't need to
 * branch on `isAuthenticated` at all.
 */

import { useEffect } from "react";
import { ShoppingCart } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import {
  fetchCart,
  moveItemToCart,
  removeCartItem,
  saveItemForLater,
  setCouponCode,
  updateCartItemQuantity,
} from "../cartSlice";
import { couponApi } from "../../../api/couponApi";
import CartItemRow from "../components/CartItemRow";
import CartSummary from "../components/CartSummary";
import { CartItemSkeleton } from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const { cart, couponCode, status, error } = useAppSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchCart(couponCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const handleApplyCoupon = async (code) => {
    // Validate first so an invalid code never gets persisted into the
    // cart-summary request — ValidateCouponView gives a precise error
    // message (expired/min-order-not-met/etc.) that CartSummarySerializer's
    // generic `coupon_error` field alone wouldn't distinguish as clearly.
    try {
      await couponApi.validate(code, cart?.summary?.subtotal ?? "0");
      dispatch(setCouponCode(code));
      dispatch(fetchCart(code));
    } catch {
      dispatch(setCouponCode(code));
      dispatch(fetchCart(code)); // still fetch — summary.coupon_error will surface the reason
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(setCouponCode(null));
    dispatch(fetchCart());
  };

  if (status === "loading" && !cart) {
    return (
      <div className="card">
        {Array.from({ length: 3 }).map((_, i) => (
          <CartItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (status === "failed" && !cart) {
    return <ErrorMessage message={error} onRetry={() => dispatch(fetchCart(couponCode))} />;
  }

  if (!cart) return null;

  const hasItems = cart.items.length > 0;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Shopping Cart</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card">
            {hasItems ? (
              cart.items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  variant="active"
                  onQuantityChange={(id, quantity) => dispatch(updateCartItemQuantity({ itemId: id, quantity }))}
                  onRemove={(id) => dispatch(removeCartItem(id))}
                  onSaveForLater={(id) => dispatch(saveItemForLater(id))}
                />
              ))
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title="Your cart is empty"
                message="Looks like you haven't added anything yet. Start browsing to find something you'll love."
                actionLabel="Continue shopping"
                actionHref="/products"
              />
            )}
          </div>

          {cart.saved_for_later.length > 0 && (
            <div className="card mt-6">
              <h2 className="mb-2 font-semibold text-gray-900">Saved for Later</h2>
              {cart.saved_for_later.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  variant="saved"
                  onRemove={(id) => dispatch(removeCartItem(id))}
                  onMoveToCart={(id) => dispatch(moveItemToCart(id))}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <CartSummary summary={cart.summary} onApplyCoupon={handleApplyCoupon} onRemoveCoupon={handleRemoveCoupon} />
        </div>
      </div>
    </div>
  );
}
