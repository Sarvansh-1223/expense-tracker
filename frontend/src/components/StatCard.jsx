export default function StatCard({ icon: Icon, label, value, tone = "accent", trend }) {
  const toneMap = {
    accent: { bg: "var(--accent-soft)", color: "var(--accent-strong)" },
    brass: { bg: "var(--brass-soft)", color: "var(--brass)" },
    info: { bg: "var(--info-soft)", color: "var(--info)" },
    danger: { bg: "var(--danger-soft)", color: "var(--danger)" },
    ink: { bg: "var(--surface-muted)", color: "var(--ink-muted)" },
  };
  const t = toneMap[tone] || toneMap.accent;

  return (
    <div className="stat-card">
      <div className="stat-card-head">
        <span className="stat-label">{label}</span>
        <span className="stat-icon" style={{ background: t.bg, color: t.color }}>
          <Icon />
        </span>
      </div>
      <div className="stat-value num">{value}</div>
      {trend && (
        <div className="stat-trend" style={{ color: trend.negative ? "var(--danger)" : "var(--accent)" }}>
          {trend.text}
        </div>
      )}
    </div>
  );
}
