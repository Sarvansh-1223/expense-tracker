import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Download, Pencil, Trash2, Receipt } from "lucide-react";
import { ExpenseAPI, CategoryAPI } from "../services/resources";
import ExpenseModal from "../components/ExpenseModal";
import { LoadingSpinner, EmptyState, ConfirmDialog } from "../components/Common";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from "../utils/format";

export default function Transactions() {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [ordering, setOrdering] = useState("-date");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { page, ordering };
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    if (paymentFilter) params.payment_method = paymentFilter;
    const { data } = await ExpenseAPI.list(params);
    setExpenses(data.results ?? data);
    setCount(data.count ?? (data.results ?? data).length);
    setLoading(false);
  }, [page, search, categoryFilter, paymentFilter, ordering]);

  useEffect(() => { CategoryAPI.list().then(({ data }) => setCategories(data)); }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingExpense(null); setModalOpen(true); };
  const openEdit = (exp) => { setEditingExpense(exp); setModalOpen(true); };

  const onSaved = () => {
    setModalOpen(false);
    load();
    toast.success(editingExpense ? "Expense updated." : "Expense added.");
  };

  const confirmDelete = async () => {
    try {
      await ExpenseAPI.remove(deleteTarget.id);
      toast.success("Expense deleted.");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Could not delete this expense.");
    }
  };

  const exportCsv = () => {
    const params = {};
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    if (paymentFilter) params.payment_method = paymentFilter;
    window.open(ExpenseAPI.exportUrl(params), "_blank");
  };

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">{count} expense{count === 1 ? "" : "s"} recorded</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={exportCsv}><Download /> Export CSV</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus /> Add Expense</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-box" style={{ flex: "1 1 220px" }}>
          <Search />
          <input className="input" placeholder="Search transactions…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        </div>
        <select className="input" style={{ width: 170 }} value={categoryFilter} onChange={(e) => { setPage(1); setCategoryFilter(e.target.value); }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{ width: 160 }} value={paymentFilter} onChange={(e) => { setPage(1); setPaymentFilter(e.target.value); }}>
          <option value="">All payment methods</option>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <select className="input" style={{ width: 160 }} value={ordering} onChange={(e) => setOrdering(e.target.value)}>
          <option value="-date">Newest first</option>
          <option value="date">Oldest first</option>
          <option value="-amount">Amount: high to low</option>
          <option value="amount">Amount: low to high</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner full /> : expenses.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions found" subtitle="Try adjusting your filters, or add a new expense." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Category</th><th>Payment Method</th>
                  <th style={{ textAlign: "right" }}>Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ color: "var(--ink-muted)" }}>{formatDate(e.date)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.title}</div>
                      {e.description && <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{e.description}</div>}
                    </td>
                    <td>
                      <span className="tag" style={{ background: `${e.category_color}22`, color: e.category_color }}>{e.category_name}</span>
                    </td>
                    <td style={{ color: "var(--ink-muted)" }}>{PAYMENT_METHOD_LABELS[e.payment_method]}</td>
                    <td className="num amount-neg" style={{ textAlign: "right" }}>-{formatCurrency(e.amount)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="icon-btn" onClick={() => openEdit(e)} aria-label="Edit"><Pencil size={13} /></button>
                        <button className="icon-btn" onClick={() => setDeleteTarget(e)} aria-label="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      <ExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={onSaved} categories={categories} expense={editingExpense} />
      <ConfirmDialog open={!!deleteTarget} title="Delete this expense?" message={deleteTarget ? `"${deleteTarget.title}" for ${formatCurrency(deleteTarget.amount)} will be permanently removed.` : ""} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
