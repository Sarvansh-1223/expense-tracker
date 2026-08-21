import { useEffect, useState } from "react";
import { Plus, Trash2, Sun, Moon } from "lucide-react";
import { CategoryAPI } from "../services/resources";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { ConfirmDialog, LoadingSpinner } from "../components/Common";

const SWATCHES = ["#1F7A5C", "#B9832F", "#B8443C", "#2C6E9E", "#8b5cf6", "#ec4899", "#0ea5e9", "#64748b"];

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ name: "", color: SWATCHES[0] });
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    CategoryAPI.list().then(({ data }) => { setCategories(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    setAdding(true);
    try {
      await CategoryAPI.create(newCat);
      toast.success("Category added.");
      setNewCat({ name: "", color: SWATCHES[0] });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.errors?.name?.[0] || "Could not add category.");
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await CategoryAPI.remove(deleteTarget.id);
      toast.success("Category removed.");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Categories used by existing transactions can't be deleted.");
      setDeleteTarget(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your profile, categories, and appearance.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card" style={{ marginBottom: 16 }}>
          <span className="section-title">Profile</span>
          <div className="field">
            <label>Username</label>
            <input className="input" value={user?.username || ""} disabled />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" value={user?.email || ""} disabled />
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Member since {user?.date_joined ? new Date(user.date_joined).toLocaleDateString("en-IN") : "—"}</p>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <span className="section-title">Appearance</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>Theme</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>Switch between light and dark mode. Your choice is saved.</div>
            </div>
            <button className="btn btn-secondary" onClick={toggleTheme}>
              {theme === "dark" ? <><Sun size={15} /> Light mode</> : <><Moon size={15} /> Dark mode</>}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <span className="section-title">Categories</span>
        <form onSubmit={addCategory} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <label>New category name</label>
            <input className="input" value={newCat.name} onChange={(e) => setNewCat((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Pet Care" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Color</label>
            <div style={{ display: "flex", gap: 6 }}>
              {SWATCHES.map((c) => (
                <button type="button" key={c} onClick={() => setNewCat((s) => ({ ...s, color: c }))}
                  style={{
                    width: 24, height: 24, borderRadius: "50%", background: c, border: newCat.color === c ? "2px solid var(--ink)" : "2px solid transparent",
                    cursor: "pointer",
                  }} />
              ))}
            </div>
          </div>
          <button className="btn btn-primary" disabled={adding}><Plus size={15} /> Add</button>
        </form>

        {loading ? <LoadingSpinner /> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {categories.map((c) => (
              <div key={c.id} className="chip" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px" }}>
                <span className="avatar-dot" style={{ background: c.color }} />
                {c.name}
                {!c.is_default && (
                  <button className="icon-btn" style={{ width: 20, height: 20, border: "none" }} onClick={() => setDeleteTarget(c)} aria-label="Delete category">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Delete this category?" message={deleteTarget ? `"${deleteTarget.name}" will be removed. This only works if no transactions use it.` : ""} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
