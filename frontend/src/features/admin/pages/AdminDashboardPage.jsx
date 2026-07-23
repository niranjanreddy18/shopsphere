/**
 * AdminDashboardPage — the Admin Dashboard's landing screen: top-line KPI
 * tiles (revenue, orders, customers, products, low stock) plus a "Recent
 * Orders" panel. Charts live on the dedicated AnalyticsDashboardPage
 * rather than here, keeping this page focused on "what needs my attention
 * right now" rather than trend analysis.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, DollarSign, Package, ShoppingBag, Users } from "lucide-react";

import { analyticsApi } from "../../../api/analyticsApi";
import StatCard from "../components/StatCard";
import { Skeleton } from "../../../components/ui/Skeleton";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([analyticsApi.dashboardStats(), analyticsApi.recentOrders(8)])
      .then(([statsData, ordersData]) => {
        setStats(statsData);
        setRecentOrders(ordersData);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  }, []);

  if (status === "loading") {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (status === "failed") return <ErrorMessage message="Failed to load dashboard data." />;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Admin Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={`$${Number(stats.total_revenue).toFixed(2)}`} icon={DollarSign} />
        <StatCard
          label="Revenue This Month"
          value={`$${Number(stats.revenue_this_month).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard label="Total Orders" value={stats.total_orders} sublabel={`${stats.orders_this_month} this month`} icon={ShoppingBag} />
        <StatCard label="Pending Orders" value={stats.pending_orders_count} icon={ShoppingBag} />
        <StatCard label="Total Customers" value={stats.total_customers} sublabel={`+${stats.new_customers_this_month} this month`} icon={Users} />
        <StatCard label="Active Products" value={stats.total_products} icon={Package} />
        <StatCard label="Low Stock Items" value={stats.low_stock_count} icon={AlertTriangle} />
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link to="/admin/orders" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="py-2">
                    <Link to={`/admin/orders?search=${order.order_number}`} className="text-brand-600 hover:underline">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="py-2">{order.status}</td>
                  <td className="py-2">${Number(order.total_amount).toFixed(2)}</td>
                  <td className="py-2 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
