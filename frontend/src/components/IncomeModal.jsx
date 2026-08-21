import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { IncomeAPI } from "../services/resources";
import { extractError } from "../utils/errors";
import { INCOME_SOURCE_LABELS } from "../utils/format";

const EMPTY = { source: "salary", amount: "", date: new Date().toISOString().slice(0, 10), description: "", notes: "" };

export default function IncomeModal({ open, onClose, onSaved, income }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(income ? {
        source: income.source, amount: income.amount, date: income.date,
        description: income.description || "", notes: income.notes || "",
      } : EMPTY);
      setErrors({});
    }
  }, [open, income]);

  if (!open) return null;

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (income) await IncomeAPI.update(income.id, form);
      else await IncomeAPI.create(form);
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
          <h3 style={{ fontSize: 17 }}>{income ? "Edit income" : "Add income"}</h3>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {errors.non_field_errors && <p className="field-error" style={{ marginBottom: 10 }}>{errors.non_field_errors[0]}</p>}
            <div className="field-row">
              <div className="field">
                <label>Source</label>
                <select className="input" value={form.source} onChange={(e) => update("source", e.target.value)}>
                  {Object.entries(INCOME_SOURCE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Amount (₹)</label>
                <input className="input" type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" />
                {errors.amount && <span className="field-error">{errors.amount[0]}</span>}
              </div>
            </div>
            <div className="field">
              <label>Date</label>
              <input className="input" type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <input className="input" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g. August salary" />
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : income ? "Save changes" : "Add income"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
