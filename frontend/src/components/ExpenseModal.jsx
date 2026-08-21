import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ExpenseAPI } from "../services/resources";
import { extractError } from "../utils/errors";
import { PAYMENT_METHOD_LABELS } from "../utils/format";

const EMPTY = {
  title: "", amount: "", category: "", date: new Date().toISOString().slice(0, 10),
  payment_method: "upi", description: "", notes: "",
};

export default function ExpenseModal({ open, onClose, onSaved, categories, expense }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(expense ? {
        title: expense.title, amount: expense.amount, category: expense.category,
        date: expense.date, payment_method: expense.payment_method,
        description: expense.description || "", notes: expense.notes || "",
      } : EMPTY);
      setErrors({});
    }
  }, [open, expense]);

  if (!open) return null;

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form, category: Number(form.category) };
      if (expense) await ExpenseAPI.update(expense.id, payload);
      else await ExpenseAPI.create(payload);
      onSaved();
    } catch (err) {
      const data = err?.response?.data?.errors;
      if (data) setErrors(data);
      else setErrors({ non_field_errors: [extractError(err)] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 17 }}>{expense ? "Edit expense" : "Add expense"}</h3>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {errors.non_field_errors && <p className="field-error" style={{ marginBottom: 10 }}>{errors.non_field_errors[0]}</p>}

            <div className="field">
              <label>Title</label>
              <input className="input" required value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Dinner at cafe" />
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
              <input className="input" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Short description" />
            </div>

            <div className="field">
              <label>Notes (optional)</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : expense ? "Save changes" : "Add expense"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
