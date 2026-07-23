/**
 * OrderDetailPage — full detail view for a single order: line items,
 * shipping/billing addresses, the status timeline, and actions (cancel,
 * download invoice) gated by what the order's current state allows.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { ordersApi } from "../../../api/ordersApi";
import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { cancelOrder, clearCurrentOrder, fetchOrderDetail } from "../orderSlice";
import OrderTrackingTimeline from "../components/OrderTrackingTimeline";
import Button from "../../../components/ui/Button";
import { FullPageSpinner } from "../../../components/ui/Spinner";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function OrderDetailPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { currentOrder: order, currentOrderStatus: status, error } = useAppSelector((state) => state.orders);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    dispatch(fetchOrderDetail(id));
    return () => dispatch(clearCurrentOrder());
  }, [dispatch, id]);

  const handleCancel = () => {
    if (window.confirm("Cancel this order? This cannot be undone.")) {
      dispatch(cancelOrder({ id, reason: "Cancelled by customer" }));
    }
  };

  const handleDownloadInvoice = async () => {
    setIsDownloading(true);
    try {
      const blob = await ordersApi.downloadInvoice(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${order.order_number}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  if (status === "loading" || status === "idle") return <FullPageSpinner />;
  if (status === "failed" || !order) {
    return <ErrorMessage message={error} onRetry={() => dispatch(fetchOrderDetail(id))} />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500">Placed {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDownloadInvoice} isLoading={isDownloading}>
            Download Invoice
          </Button>
          {order.is_cancellable_by_customer && (
            <Button variant="danger" onClick={handleCancel}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900">Items</h2>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                    {item.product_image && (
                      <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">${Number(item.line_total).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <OrderTrackingTimeline order={order} />
        </div>

        <div className="space-y-6 lg:col-span-1">
          <div className="card">
            <h2 className="mb-3 font-semibold text-gray-900">Shipping Address</h2>
            <p className="text-sm text-gray-600">
              {order.shipping_full_name}
              <br />
              {order.shipping_line1}
              {order.shipping_line2 && <>, {order.shipping_line2}</>}
              <br />
              {order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}
              <br />
              {order.shipping_country}
            </p>
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold text-gray-900">Payment Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Subtotal</dt>
                <dd className="text-gray-900">${Number(order.subtotal).toFixed(2)}</dd>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Discount</dt>
                  <dd>-${Number(order.discount_amount).toFixed(2)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">Shipping</dt>
                <dd className="text-gray-900">${Number(order.shipping_amount).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Tax</dt>
                <dd className="text-gray-900">${Number(order.tax_amount).toFixed(2)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>${Number(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
