/** AdminCustomersPage — list customers and activate/deactivate accounts. */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { adminCustomersApi } from "../../../api/adminApi";
import { Skeleton } from "../../../components/ui/Skeleton";
import Pagination from "../../../components/ui/Pagination";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState({ results: [], count: 0, total_pages: 0 });
  const [status, setStatus] = useState("loading");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = () => {
    setStatus("loading");
    adminCustomersApi
      .list({ search: search || undefined, page })
      .then((data) => {
        setCustomers(data);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(load, [search, page]);

  const handleToggleActive = async (customer) => {
    await adminCustomersApi.setActive(customer.id, !customer.is_active);
    toast.success(customer.is_active ? "Customer deactivated." : "Customer reactivated.");
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Manage Customers</h1>
        <input
          defaultValue={search}
          onKeyDown={(e) => e.key === "Enter" && setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="input-field !mb-0"
        />
      </div>

      {status === "loading" && <Skeleton className="h-64 w-full" />}

      {status === "succeeded" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Orders</th>
                <th className="pb-2 font-medium">Verified</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.results.map((customer) => (
                <tr key={customer.id}>
                  <td className="py-2">{customer.full_name}</td>
                  <td className="py-2 text-gray-500">{customer.email}</td>
                  <td className="py-2">{customer.order_count}</td>
                  <td className="py-2">{customer.is_email_verified ? "Yes" : "No"}</td>
                  <td className="py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${customer.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {customer.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="py-2">
                    <button onClick={() => handleToggleActive(customer)} className="font-medium text-brand-600 hover:underline">
                      {customer.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalPages={customers.total_pages} onPageChange={setPage} />
    </div>
  );
}
