/**
 * AnalyticsDashboardPage — the charts-focused counterpart to
 * AdminDashboardPage. Uses Recharts (already a supported dependency in
 * this project) for the three visualisations: monthly revenue (line),
 * daily order trends (bar), and top products (horizontal bar).
 */

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { analyticsApi } from "../../../api/analyticsApi";
import { Skeleton } from "../../../components/ui/Skeleton";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function AnalyticsDashboardPage() {
  const [revenue, setRevenue] = useState([]);
  const [orderTrends, setOrderTrends] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([analyticsApi.revenue(6), analyticsApi.orderTrends(30), analyticsApi.topProducts({ limit: 8 })])
      .then(([revenueData, trendsData, topProductsData]) => {
        setRevenue(revenueData);
        setOrderTrends(trendsData);
        setTopProducts(topProductsData);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  }, []);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (status === "failed") return <ErrorMessage message="Failed to load analytics data." />;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Analytics</h1>

      <div className="mb-6 card">
        <h2 className="mb-4 font-semibold text-gray-900">Monthly Revenue</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-6 card">
        <h2 className="mb-4 font-semibold text-gray-900">Order Trends (30 days)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={orderTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="order_count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Orders" />
            <Bar dataKey="cancelled_count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cancelled" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold text-gray-900">Top Products</h2>
        <ResponsiveContainer width="100%" height={Math.max(280, topProducts.length * 40)}>
          <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
            <YAxis dataKey="product_name" type="category" width={140} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="units_sold" fill="#2563eb" radius={[0, 4, 4, 0]} name="Units sold" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
