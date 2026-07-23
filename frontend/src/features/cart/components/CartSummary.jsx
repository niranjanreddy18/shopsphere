/**
 * CartSummary — read-only display of the server-computed totals
 * (CartService.get_summary on the backend is the single source of truth
 * for every one of these numbers; this component does no math of its own).
 */

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";
import CouponForm from "./CouponForm";
import Button from "../../../components/ui/Button";

export default function CartSummary({ summary, onApplyCoupon, onRemoveCoupon }) {
  const fmt = (n) => `$${Number(n).toFixed(2)}`;
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleCheckout = () => {
    // Checkout requires an account (shipping/billing addresses and order
    // history are tied to a user) — an unauthenticated shopper is sent to
    // log in first, same as ProtectedRoute would do for the page itself;
    // routing them there directly here avoids an extra bounce through a
    // page that immediately redirects.
    navigate(isAuthenticated ? "/checkout" : "/login", { state: { from: { pathname: "/checkout" } } });
  };

  return (
    <div className="card h-fit">
      <h2 className="mb-4 font-semibold text-gray-900">Order Summary</h2>

      <div className="mb-4">
        <CouponForm
          appliedCode={summary.coupon_code}
          couponError={summary.coupon_error}
          onApply={onApplyCoupon}
          onRemove={onRemoveCoupon}
        />
      </div>

      <dl className="space-y-2 border-t border-gray-100 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-600">Subtotal ({summary.item_count} items)</dt>
          <dd className="text-gray-900">{fmt(summary.subtotal)}</dd>
        </div>
        {Number(summary.discount) > 0 && (
          <div className="flex justify-between text-green-600">
            <dt>Discount</dt>
            <dd>-{fmt(summary.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-gray-600">Shipping</dt>
          <dd className="text-gray-900">{Number(summary.shipping) === 0 ? "Free" : fmt(summary.shipping)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-600">Tax</dt>
          <dd className="text-gray-900">{fmt(summary.tax)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-base font-semibold text-gray-900">
        <span>Total</span>
        <span>{fmt(summary.total)}</span>
      </div>

      <Button onClick={handleCheckout} disabled={summary.item_count === 0} className="mt-6 w-full">
        Proceed to Checkout
      </Button>
    </div>
  );
}
