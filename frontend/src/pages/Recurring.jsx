import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Repeat, PauseCircle, PlayCircle } from "lucide-react";
import { RecurringAPI, CategoryAPI } from "../services/resources";
import RecurringModal from "../components/RecurringModal";
import { LoadingSpinner, EmptyState, ConfirmDialog } from "../components/Common";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDateFull } from "../utils/format";

export default function Recurring() {
  const toast = useToast();
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, catRes] = await Promise.all([RecurringAPI.list(), CategoryAPI.list()]);
    setRules(rulesRes.data.results ?? rulesRes.data);
    setCategories(catRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (rule) => { setEditing(rule); setModalOpen(true); };

  const onSaved = () => {
    setModalOpen(false);
    load();
    toast.success(editing ? "Recurring expense updated." : "Recurring expense added.");
  };

  const toggleActive = async (rule) => {
    try {
      await RecurringAPI.update(rule.id, { is_active: !rule.is_active });
      load();
      toast.success(rule.is_active ? "Paused." : "Resumed.");
    } catch {
      toast.error("Could not update.");
    }
  };

  const confirmDelete = async () => {
    try {
      await RecurringAPI.remove(deleteTarget.id);
      toast.success("Recurring expense removed.");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Could not delete.");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recurring Expenses</h1>
          <p className="page-sub">Rent, subscriptions, and bills that repeat automatically.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus /> Add Recurring Expense</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner full /> : rules.length === 0 ? (
          <EmptyState icon={Repeat} title="No recurring expenses" subtitle="Add rent, Netflix, or any bill that repeats on a schedule." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Category</th><th>Frequency</th><th>Next due</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td><span className="tag" style={{ background: `${r.category_color}22`, color: r.category_color }}>{r.category_name}</span></td>
                    <td style={{ color: "var(--ink-muted)" }}>{r.frequency_display}</td>
                    <td style={{ color: "var(--ink-muted)" }}>{formatDateFull(r.next_due_date)}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(r.amount)}</td>
                    <td>
                      <span className="tag" style={{
                        background: r.is_active ? "var(--accent-soft)" : "var(--surface-muted)",
                        color: r.is_active ? "var(--accent-strong)" : "var(--ink-faint)",
                      }}>
                        {r.is_active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="icon-btn" onClick={() => toggleActive(r)} aria-label="Toggle active">
                          {r.is_active ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
                        </button>
                        <button className="icon-btn" onClick={() => openEdit(r)} aria-label="Edit"><Pencil size={13} /></button>
                        <button className="icon-btn" onClick={() => setDeleteTarget(r)} aria-label="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecurringModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={onSaved} categories={categories} rule={editing} />
      <ConfirmDialog open={!!deleteTarget} title="Delete this recurring expense?" message={deleteTarget ? `"${deleteTarget.name}" will stop generating future transactions. Past transactions are kept.` : ""} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
