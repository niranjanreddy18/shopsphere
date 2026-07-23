/**
 * OrderHistoryPage — the customer's own past orders, newest first, with a
 * status filter and pagination. Reuses the shared Pagination component
 * from components/ui, the same one product listing uses.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { fetchOrderHistory } from "../orderSlice";
import Pagination from "../../../components/ui/Pagination";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/ui/EmptyState";
import { Skeleton } from "../../../components/ui/Skeleton";

const STATUS_OPTIONS = ["", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

const STATUS_STYLES = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-700",
};

export default function OrderHistoryPage() {
  const dispatch = useAppDispatch();
  const { history, error } = useAppSelector((state) => state.orders);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    dispatch(fetchOrderHistory({ page, status: statusFilter || undefined }));
  }, [dispatch, page, statusFilter]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Order History</h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input-field !mb-0 w-auto"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>

      {history.status === "loading" && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {history.status === "failed" && <ErrorMessage message={error} />}

      {history.status === "succeeded" && history.results.length === 0 && (
        <EmptyState
          icon={Package}
          title="No orders yet"
          message="Once you place an order, you'll be able to track its status and view details here."
          actionLabel="Start shopping"
          actionHref="/products"
        />
      )}

      {history.status === "succeeded" && history.results.length > 0 && (
        <div className="card divide-y divide-gray-100">
          {history.results.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-gray-900">{order.order_number}</p>
                <p className="text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleDateString()} · {order.item_count} item(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] || ""}`}>
                  {order.status}
                </span>
                <span className="font-semibold text-gray-900">${Number(order.total_amount).toFixed(2)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={history.totalPages} onPageChange={setPage} />
    </div>
  );
}
