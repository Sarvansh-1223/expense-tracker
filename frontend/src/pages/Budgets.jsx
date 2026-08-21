import { useEffect, useState, useCallback } from "react";
import { Save, Plus, Trash2, PiggyBank } from "lucide-react";
import { BudgetAPI, CategoryBudgetAPI, CategoryAPI, DashboardAPI } from "../services/resources";
import BudgetProgress from "../components/BudgetProgress";
import { LoadingSpinner, EmptyState, MonthSwitcher, ConfirmDialog } from "../components/Common";
import { useToast } from "../context/ToastContext";
import { formatCurrency, monthLabel } from "../utils/format";

export default function Budgets() {
  const toast = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [breakdown, setBreakdown] = useState([]);
  const [summary, setSummary] = useState(null);
  const [savingBudget, setSavingBudget] = useState(false);
  const [newCatBudget, setNewCatBudget] = useState({ category: "", amount: "" });
  const [addingCat, setAddingCat] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [dashRes, budgetRes, catRes] = await Promise.all([
      DashboardAPI.get({ year, month }),
      BudgetAPI.list({ year, month }),
      CategoryAPI.list(),
    ]);
    setSummary(dashRes.data.summary);
    setBreakdown(dashRes.data.category_budgets);
    setMonthlyBudget(budgetRes.data.results?.[0]?.amount ?? budgetRes.data[0]?.amount ?? "");
    setCategories(catRes.data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const saveMonthlyBudget = async (e) => {
    e.preventDefault();
    setSavingBudget(true);
    try {
      await BudgetAPI.create({ year, month, amount: monthlyBudget });
      toast.success("Monthly budget saved.");
      load();
    } catch {
      toast.error("Could not save budget.");
    } finally {
      setSavingBudget(false);
    }
  };

  const addCategoryBudget = async (e) => {
    e.preventDefault();
    if (!newCatBudget.category || !newCatBudget.amount) return;
    setAddingCat(true);
    try {
      await CategoryBudgetAPI.create({ year, month, category: Number(newCatBudget.category), amount: newCatBudget.amount });
      toast.success("Category budget added.");
      setNewCatBudget({ category: "", amount: "" });
      load();
    } catch {
      toast.error("Could not add category budget.");
    } finally {
      setAddingCat(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await CategoryBudgetAPI.remove(deleteTarget.id);
      toast.success("Category budget removed.");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Could not remove.");
    }
  };

  if (loading) return <div className="page"><LoadingSpinner full /></div>;

  const usedCategoryIds = new Set(breakdown.map((b) => b.category_id));
  const availableCategories = categories.filter((c) => !usedCategoryIds.has(c.id));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-sub">Plan and track spending limits for {monthLabel(year, month)}.</p>
        </div>
        <MonthSwitcher year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      <div className="grid-2">
        <div className="card" style={{ marginBottom: 16 }}>
          <span className="section-title">Monthly Budget</span>
          <form onSubmit={saveMonthlyBudget} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Budget amount (₹)</label>
              <input className="input" type="number" min="0" step="1" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} placeholder="30000" />
            </div>
            <button className="btn btn-primary" disabled={savingBudget}><Save size={15} /> Save</button>
          </form>

          {summary && summary.monthly_budget > 0 && (
            <div style={{ marginTop: 18 }}>
              <BudgetProgress label="Overall usage" spent={summary.total_expenses} budget={summary.monthly_budget}
                usagePct={summary.budget_usage_percentage} exceeded={summary.budget_remaining < 0} />
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <span className="section-title">Add Category Budget</span>
          <form onSubmit={addCategoryBudget} className="field-row" style={{ alignItems: "flex-end" }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Category</label>
              <select className="input" value={newCatBudget.category} onChange={(e) => setNewCatBudget((s) => ({ ...s, category: e.target.value }))}>
                <option value="">Select…</option>
                {availableCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Amount (₹)</label>
              <input className="input" type="number" min="0" value={newCatBudget.amount} onChange={(e) => setNewCatBudget((s) => ({ ...s, amount: e.target.value }))} placeholder="5000" />
            </div>
            <button className="btn btn-secondary" disabled={addingCat || availableCategories.length === 0} style={{ height: 39 }}><Plus size={15} /></button>
          </form>
        </div>
      </div>

      <div className="card">
        <span className="section-title">Category Breakdown</span>
        {breakdown.length === 0 ? (
          <EmptyState icon={PiggyBank} title="No category budgets yet" subtitle="Add one above to start tracking category-level spending." />
        ) : (
          breakdown.map((b) => (
            <div key={b.category_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <BudgetProgress label={b.category_name} color={b.category_color} spent={b.spent} budget={b.budget} usagePct={b.usage_percentage} exceeded={b.exceeded} />
              </div>
              <button className="icon-btn" style={{ marginBottom: 14 }} onClick={() => setDeleteTarget(b)} aria-label="Remove budget"><Trash2 size={13} /></button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Remove this category budget?" message={deleteTarget ? `The budget for ${deleteTarget.category_name} will be removed. Spending history is unaffected.` : ""} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
