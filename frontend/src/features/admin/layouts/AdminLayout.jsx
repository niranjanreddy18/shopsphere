/**
 * AdminLayout — sidebar shell for every /admin/* screen, mirroring the
 * pattern ProfileLayout established for the customer profile section.
 * Nested under a <ProtectedRoute requiredRole="ADMIN"> in AppRoutes, so
 * every page rendered inside this layout can assume the caller is an admin.
 */

import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Gauge, Package, ShoppingBag, Star, Tags, Ticket, Users } from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: Gauge, end: true },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/brands", label: "Brands", icon: Tags },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/customers", label: "Customers", icon: Users },
];

export default function AdminLayout() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
      <aside className="md:col-span-1">
        <nav className="card space-y-1 p-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="md:col-span-4">
        <Outlet />
      </section>
    </div>
  );
}
