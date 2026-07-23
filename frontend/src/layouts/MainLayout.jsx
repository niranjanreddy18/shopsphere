/**
 * MainLayout — the standard page shell (header + content + footer) used for
 * every "normal" page (home, profile, product listings once built, etc).
 * `<Outlet />` renders whichever child route matched.
 */

import { Outlet } from "react-router-dom";

import Header from "../components/common/Header";
import Footer from "../components/common/Footer";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex-1 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
