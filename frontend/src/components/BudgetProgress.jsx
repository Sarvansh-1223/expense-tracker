import { formatCurrency } from "../utils/format";

export default function BudgetProgress({ label, color, spent, budget, usagePct, exceeded }) {
  const pct = Math.min(usagePct, 100);
  const barColor = exceeded ? "var(--danger)" : usagePct >= 80 ? "var(--brass)" : (color || "var(--accent)");

  return (
    <div className="cat-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div className="cat-row-top">
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <span className="avatar-dot" style={{ background: color || "var(--accent)" }} />
          {label}
        </span>
        <span className="num" style={{ color: "var(--ink-muted)" }}>
          {formatCurrency(spent)} / {formatCurrency(budget)}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      {exceeded && <span style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4 }}>Budget exceeded</span>}
    </div>
  );
}
