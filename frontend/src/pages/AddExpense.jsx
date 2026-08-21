import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CategoryAPI, ExpenseAPI } from "../services/resources";
import { useToast } from "../context/ToastContext";
import { PAYMENT_METHOD_LABELS } from "../utils/format";

const EMPTY = {
  title: "", amount: "", category: "", date: new Date().toISOString().slice(0, 10),
  payment_method: "upi", description: "", notes: "",
};

export default function AddExpense() {
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { CategoryAPI.list().then(({ data }) => setCategories(data)); }, []);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await ExpenseAPI.create({ ...form, category: Number(form.category) });
      toast.success("Expense added.");
      navigate("/transactions");
    } catch (err) {
      setErrors(err?.response?.data?.errors || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Expense</h1>
          <p className="page-sub">Log a new transaction for this month.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={submit}>
          <div className="field">
            <label>Title</label>
            <input className="input" required autoFocus value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Dinner at cafe" />
            {errors.title && <span className="field-error">{errors.title[0]}</span>}
          </div>
          <div className="field-row">
            <div className="field">
              <label>Amount (₹)</label>
              <input className="input" type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" />
              {errors.amount && <span className="field-error">{errors.amount[0]}</span>}
            </div>
            <div className="field">
              <label>Date</label>
              <input className="input" type="date" required max={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(e) => update("date", e.target.value)} />
              {errors.date && <span className="field-error">{errors.date[0]}</span>}
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Category</label>
              <select className="input" required value={form.category} onChange={(e) => update("category", e.target.value)}>
                <option value="" disabled>Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.category && <span className="field-error">{errors.category[0]}</span>}
            </div>
            <div className="field">
              <label>Payment method</label>
              <select className="input" value={form.payment_method} onChange={(e) => update("payment_method", e.target.value)}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <input className="input" value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>
          <div className="field">
            <label>Notes (optional)</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block" disabled={saving} style={{ marginTop: 6 }}>
            {saving ? "Saving…" : "Add expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
