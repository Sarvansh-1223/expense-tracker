import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractError } from "../utils/errors";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      setError(extractError(err) === "Something went wrong. Please try again." ? "Invalid username or password." : extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-mark">
          <span className="brand-mark">FinTrack</span>
          <p style={{ color: "var(--ink-muted)", fontSize: 13.5, marginTop: 6 }}>Sign in to your expense tracker</p>
        </div>
        <div className="card">
          <form onSubmit={submit}>
            {error && (
              <div style={{ background: "var(--danger-soft)", color: "var(--danger)", padding: "9px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}
            <div className="field">
              <label>Username</label>
              <input className="input" autoFocus required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="demo" />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            <button className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 6 }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-muted)", marginTop: 18 }}>
            Don't have an account? <Link to="/register" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Create one</Link>
          </p>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-faint)", marginTop: 16 }}>
          Demo login: <span className="num">demo / demopass123</span>
        </p>
      </div>
    </div>
  );
}
