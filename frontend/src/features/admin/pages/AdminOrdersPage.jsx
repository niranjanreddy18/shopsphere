/**
 * AdminOrdersPage — list every order, filter by status/search, and update
 * status/tracking inline via a small expandable action row.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { ordersApi } from "../../../api/ordersApi";
import Button from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import Pagination from "../../../components/ui/Pagination";

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

// Mirrors apps/orders/validators.py::ALLOWED_TRANSITIONS on the backend —
// used here only to restrict which options the admin is offered, so the
// UI doesn't invite a request the server will reject anyway.
const NEXT_STATUSES = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState({ results: [], count: 0, total_pages: 0 });
  const [status, setStatus] = useState("loading");
  const [expandedId, setExpandedId] = useState(null);
  const [trackingForm, setTrackingForm] = useState({ tracking_number: "", carrier: "" });

  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "";
  const page = Number(searchParams.get("page")) || 1;

  const load = () => {
    setStatus("loading");
    ordersApi
      .adminList({ search: search || undefined, status: statusFilter || undefined, page })
      .then((data) => {
        setOrders(data);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(load, [search, statusFilter, page]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const handleStatusChange = async (order, newStatus) => {
    try {
      await ordersApi.adminUpdateStatus(order.id, { status: newStatus });
      toast.success(`Order ${order.order_number} updated to ${newStatus}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update order status.");
    }
  };

  const handleSetTracking = async (order) => {
    try {
      await ordersApi.adminSetTracking(order.id, trackingForm);
      toast.success("Tracking info saved.");
      setExpandedId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save tracking info.");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Manage Orders</h1>
        <div className="flex gap-2">
          <input
            defaultValue={search}
            onKeyDown={(e) => e.key === "Enter" && updateParam("search", e.target.value)}
            placeholder="Search order # or email..."
            className="input-field !mb-0"
          />
          <select value={statusFilter} onChange={(e) => updateParam("status", e.target.value)} className="input-field !mb-0 w-auto">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {status === "loading" && <Skeleton className="h-64 w-full" />}

      {status === "succeeded" && (
        <div className="card divide-y divide-gray-50">
          {orders.results.map((order) => (
            <div key={order.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()} · ${Number(order.total_amount).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{order.status}</span>
                  {NEXT_STATUSES[order.status]?.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => e.target.value && handleStatusChange(order, e.target.value)}
                      className="input-field !mb-0 w-auto text-xs"
                    >
                      <option value="">Change status...</option>
                      {NEXT_STATUSES[order.status].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    {expandedId === order.id ? "Close" : "Set tracking"}
                  </button>
                </div>
              </div>

              {expandedId === order.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-gray-50 p-3">
                  <input
                    placeholder="Tracking number"
                    value={trackingForm.tracking_number}
                    onChange={(e) => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })}
                    className="input-field !mb-0"
                  />
                  <input
                    placeholder="Carrier"
                    value={trackingForm.carrier}
                    onChange={(e) => setTrackingForm({ ...trackingForm, carrier: e.target.value })}
                    className="input-field !mb-0"
                  />
                  <Button onClick={() => handleSetTracking(order)} className="text-xs">Save</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={orders.total_pages} onPageChange={(p) => updateParam("page", String(p))} />
    </div>
  );
}
