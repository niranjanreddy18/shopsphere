/**
 * ProfileLayout — sidebar navigation shell for the profile section
 * (profile details / addresses / change password). Nested under
 * MainLayout via the router config so the site header/footer still wrap it.
 */

import { NavLink, Outlet } from "react-router-dom";

import { ROUTES } from "../constants/routes";

const NAV_ITEMS = [
  { to: ROUTES.PROFILE, label: "Profile Details", end: true },
  { to: ROUTES.ADDRESSES, label: "Addresses" },
  { to: ROUTES.CHANGE_PASSWORD, label: "Change Password" },
];

export default function ProfileLayout() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <aside className="md:col-span-1">
        <nav className="card space-y-1 p-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="md:col-span-3">
        <Outlet />
      </section>
    </div>
  );
}
