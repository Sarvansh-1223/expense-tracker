import { ChevronLeft, ChevronRight, Inbox, AlertTriangle } from "lucide-react";
import { monthLabel } from "../utils/format";

export function LoadingSpinner({ full }) {
  return (
    <div className={full ? "loading-center" : ""} style={full ? { minHeight: 300 } : {}}>
      <div className="spinner" />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, subtitle }) {
  return (
    <div className="empty-state">
      <Icon />
      <h4>{title}</h4>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function MonthSwitcher({ year, month, onChange }) {
  const prev = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const next = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };
  return (
    <div className="month-switch">
      <button onClick={prev} aria-label="Previous month"><ChevronLeft size={16} /></button>
      <span className="month-switch-label">{monthLabel(year, month)}</span>
      <button onClick={next} aria-label="Next month"><ChevronRight size={16} /></button>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, onCancel, onConfirm, confirmLabel = "Delete", danger = true }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: "center", paddingTop: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", background: "var(--danger-soft)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
          }}>
            <AlertTriangle size={20} color="var(--danger)" />
          </div>
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>{title}</h3>
          <p style={{ color: "var(--ink-muted)", fontSize: 13.5 }}>{message}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: "center" }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
