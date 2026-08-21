import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { IncomeAPI } from "../services/resources";
import IncomeModal from "../components/IncomeModal";
import { LoadingSpinner, EmptyState, ConfirmDialog, MonthSwitcher } from "../components/Common";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate, INCOME_SOURCE_LABELS, monthLabel } from "../utils/format";

export default function Income() {
  const toast = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await IncomeAPI.list({ year, month, ordering: "-date" });
    setIncomes(data.results ?? data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const total = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (income) => { setEditing(income); setModalOpen(true); };

  const onSaved = () => {
    setModalOpen(false);
    load();
    toast.success(editing ? "Income updated." : "Income added.");
  };

  const confirmDelete = async () => {
    try {
      await IncomeAPI.remove(deleteTarget.id);
      toast.success("Income entry deleted.");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Could not delete this entry.");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Income</h1>
          <p className="page-sub">Total for {monthLabel(year, month)}: <strong className="num">{formatCurrency(total)}</strong></p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <MonthSwitcher year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          <button className="btn btn-primary" onClick={openAdd}><Plus /> Add Income</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner full /> : incomes.length === 0 ? (
          <EmptyState icon={Wallet} title="No income recorded" subtitle="Add your salary or other income for this month." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Source</th><th>Description</th><th style={{ textAlign: "right" }}>Amount</th><th></th></tr>
              </thead>
              <tbody>
                {incomes.map((i) => (
                  <tr key={i.id}>
                    <td style={{ color: "var(--ink-muted)" }}>{formatDate(i.date)}</td>
                    <td><span className="tag" style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}>{INCOME_SOURCE_LABELS[i.source]}</span></td>
                    <td>{i.description || "—"}</td>
                    <td className="num amount-pos" style={{ textAlign: "right" }}>+{formatCurrency(i.amount)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="icon-btn" onClick={() => openEdit(i)} aria-label="Edit"><Pencil size={13} /></button>
                        <button className="icon-btn" onClick={() => setDeleteTarget(i)} aria-label="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <IncomeModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={onSaved} income={editing} />
      <ConfirmDialog open={!!deleteTarget} title="Delete this income entry?" message={deleteTarget ? `${formatCurrency(deleteTarget.amount)} from ${INCOME_SOURCE_LABELS[deleteTarget.source]} will be permanently removed.` : ""} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
