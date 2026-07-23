/**
 * OrderSuccessPage — landing page after a successful payment. Re-fetches
 * the order (rather than trusting stale Redux state from the checkout
 * step) so the status shown reflects whatever PaymentPage's sync call just
 * confirmed server-side.
 */

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { fetchOrderDetail } from "../orderSlice";
import { FullPageSpinner } from "../../../components/ui/Spinner";

export default function OrderSuccessPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { currentOrder: order, currentOrderStatus: status } = useAppSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrderDetail(id));
  }, [dispatch, id]);

  if (status === "loading" || !order) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-md text-center">
      <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Order placed!</h1>
      <p className="mb-1 text-gray-600">
        Order <span className="font-medium text-gray-900">{order.order_number}</span>
      </p>
      <p className="mb-6 text-sm text-gray-500">
        Status: <span className="font-medium">{order.status}</span> · Total: ${Number(order.total_amount).toFixed(2)}
      </p>

      <div className="flex justify-center gap-3">
        <Link to={`/orders/${order.id}`} className="btn-secondary">
          View order
        </Link>
        <Link to="/products" className="btn-primary">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
