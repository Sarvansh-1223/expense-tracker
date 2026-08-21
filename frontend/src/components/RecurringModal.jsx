import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { RecurringAPI } from "../services/resources";
import { extractError } from "../utils/errors";
import { PAYMENT_METHOD_LABELS } from "../utils/format";

const EMPTY = {
  name: "", amount: "", category: "", payment_method: "upi", frequency: "monthly",
  start_date: new Date().toISOString().slice(0, 10), end_date: "", notes: "",
};

export default function RecurringModal({ open, onClose, onSaved, categories, rule }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(rule ? {
        name: rule.name, amount: rule.amount, category: rule.category,
        payment_method: rule.payment_method, frequency: rule.frequency,
        start_date: rule.start_date, end_date: rule.end_date || "", notes: rule.notes || "",
      } : EMPTY);
      setErrors({});
    }
  }, [open, rule]);

  if (!open) return null;

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form, category: Number(form.category), end_date: form.end_date || null };
      if (rule) await RecurringAPI.update(rule.id, payload);
      else await RecurringAPI.create(payload);
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
          <h3 style={{ fontSize: 17 }}>{rule ? "Edit recurring expense" : "Add recurring expense"}</h3>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {errors.non_field_errors && <p className="field-error" style={{ marginBottom: 10 }}>{errors.non_field_errors[0]}</p>}
            <div className="field">
              <label>Name</label>
              <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Netflix" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Amount (₹)</label>
                <input className="input" type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => update("amount", e.target.value)} />
                {errors.amount && <span className="field-error">{errors.amount[0]}</span>}
              </div>
              <div className="field">
                <label>Category</label>
                <select className="input" required value={form.category} onChange={(e) => update("category", e.target.value)}>
                  <option value="" disabled>Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Frequency</label>
                <select className="input" value={form.frequency} onChange={(e) => update("frequency", e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="field">
                <label>Payment method</label>
                <select className="input" value={form.payment_method} onChange={(e) => update("payment_method", e.target.value)}>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Start date</label>
                <input className="input" type="date" required value={form.start_date} onChange={(e) => update("start_date", e.target.value)} />
              </div>
              <div className="field">
                <label>End date (optional)</label>
                <input className="input" type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} />
                {errors.end_date && <span className="field-error">{errors.end_date[0]}</span>}
              </div>
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : rule ? "Save changes" : "Add recurring expense"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
