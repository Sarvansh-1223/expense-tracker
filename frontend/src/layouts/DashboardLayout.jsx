import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className={`mobile-nav-overlay ${navOpen ? "open" : ""}`} onClick={() => setNavOpen(false)} />

      <div className="main-area">
        <div className="mobile-topbar">
          <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu size={16} />
          </button>
          <span className="brand-mark" style={{ fontSize: 18 }}>Ledger</span>
          <span style={{ width: 32 }} />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
