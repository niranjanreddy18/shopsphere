/**
 * CheckoutPage — the final step before payment: pick shipping/billing
 * addresses, review the summary computed from the current cart (subtotal/
 * discount/shipping/tax/total — the exact same figures CartPage showed,
 * since OrderService.create_order_from_cart recomputes them via the same
 * ShippingService/TaxService/CouponService calls on the backend), and
 * place the order.
 *
 * Placing the order transitions it to PENDING (awaiting payment) and
 * redirects straight to the payment step — see routes/AppRoutes.jsx.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { fetchAddresses } from "../../auth/addressSlice";
import { fetchCart } from "../../cart/cartSlice";
import { placeOrder } from "../orderSlice";
import AddressSelector from "../components/AddressSelector";
import Button from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const addresses = useAppSelector((state) => state.address.items);
  const { cart, couponCode } = useAppSelector((state) => state.cart);
  const checkoutStatus = useAppSelector((state) => state.orders.checkoutStatus);

  const [shippingId, setShippingId] = useState(null);
  const [billingId, setBillingId] = useState(null);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    dispatch(fetchAddresses());
    dispatch(fetchCart(couponCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    const defaultAddress = addresses.find((a) => a.is_default) || addresses[0];
    if (defaultAddress && !shippingId) setShippingId(defaultAddress.id);
  }, [addresses, shippingId]);

  const effectiveBillingId = sameAsShipping ? shippingId : billingId;

  const handlePlaceOrder = async () => {
    const result = await dispatch(
      placeOrder({
        shipping_address_id: shippingId,
        billing_address_id: effectiveBillingId,
        coupon_code: couponCode || undefined,
        customer_note: note || undefined,
      })
    );
    if (placeOrder.fulfilled.match(result)) {
      navigate(`/orders/${result.payload.id}/pay`);
    }
  };

  if (!cart) return <Spinner />;

  const summary = cart.summary;
  const canPlaceOrder = Boolean(shippingId && effectiveBillingId) && cart.items.length > 0;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Checkout</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AddressSelector title="Shipping Address" addresses={addresses} selectedId={shippingId} onSelect={setShippingId} />

          <div className="card">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(e) => setSameAsShipping(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              Billing address same as shipping
            </label>
          </div>

          {!sameAsShipping && (
            <AddressSelector title="Billing Address" addresses={addresses} selectedId={billingId} onSelect={setBillingId} />
          )}

          <div className="card">
            <label htmlFor="note" className="mb-1 block text-sm font-medium text-gray-700">
              Order note (optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="input-field"
              placeholder="Delivery instructions, gift message, etc."
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card h-fit">
            <h2 className="mb-4 font-semibold text-gray-900">Order Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Subtotal</dt>
                <dd className="text-gray-900">${Number(summary.subtotal).toFixed(2)}</dd>
              </div>
              {Number(summary.discount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Discount</dt>
                  <dd>-${Number(summary.discount).toFixed(2)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">Shipping</dt>
                <dd className="text-gray-900">{Number(summary.shipping) === 0 ? "Free" : `$${Number(summary.shipping).toFixed(2)}`}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Tax</dt>
                <dd className="text-gray-900">${Number(summary.tax).toFixed(2)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>${Number(summary.total).toFixed(2)}</span>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder}
              isLoading={checkoutStatus === "loading"}
              className="mt-6 w-full"
            >
              Place Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
