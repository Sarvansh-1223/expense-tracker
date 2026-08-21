import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractError } from "../utils/errors";

const EMPTY = { username: "", email: "", password: "", password2: "" };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      const data = err?.response?.data?.errors;
      if (data) setErrors(data);
      else setErrors({ non_field_errors: [extractError(err)] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-mark">
          <span className="brand-mark">Ledger</span>
          <p style={{ color: "var(--ink-muted)", fontSize: 13.5, marginTop: 6 }}>Create your account</p>
        </div>
        <div className="card">
          <form onSubmit={submit}>
            {errors.non_field_errors && (
              <div style={{ background: "var(--danger-soft)", color: "var(--danger)", padding: "9px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {errors.non_field_errors[0]}
              </div>
            )}
            <div className="field">
              <label>Username</label>
              <input className="input" autoFocus required value={form.username} onChange={(e) => update("username", e.target.value)} />
              {errors.username && <span className="field-error">{errors.username[0]}</span>}
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
              {errors.email && <span className="field-error">{errors.email[0]}</span>}
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} />
              {errors.password && <span className="field-error">{errors.password[0]}</span>}
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input className="input" type="password" required value={form.password2} onChange={(e) => update("password2", e.target.value)} />
              {errors.password2 && <span className="field-error">{errors.password2[0]}</span>}
            </div>
            <button className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 6 }}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-muted)", marginTop: 18 }}>
            Already have an account? <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
