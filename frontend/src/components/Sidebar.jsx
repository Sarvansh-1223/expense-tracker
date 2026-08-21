import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, PlusCircle, Wallet, PiggyBank,
  Repeat, BarChart3, CalendarDays, Settings as SettingsIcon, LogOut, Moon, Sun, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/add-expense", label: "Add Expense", icon: PlusCircle },
  { to: "/income", label: "Income", icon: Wallet },
  { to: "/budgets", label: "Budgets", icon: PiggyBank },
  { to: "/recurring", label: "Recurring Expenses", icon: Repeat },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span className="brand-mark">FinTrack</span>
          <span className="brand-tick">·fin</span>
        </div>
        <button className="icon-btn" onClick={onClose} style={{ display: open ? "flex" : "none" }} aria-label="Close menu">
          <X size={15} />
        </button>
      </div>

      <nav className="nav-group">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.username}</span>
            <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{user?.email}</span>
          </div>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
        <button className="nav-link" onClick={logout} style={{ border: "none", background: "transparent", width: "100%", textAlign: "left" }}>
          <LogOut />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
