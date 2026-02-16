import { useEffect, useState, FormEvent } from "react";
import api from "../../lib/api";
import { showToast } from "../../components/Toast";

interface Item {
  id: string;
  title: string;
  description: string | null;
  basePrice: number;
  status: string;
}

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", basePrice: "" });
  const [loading, setLoading] = useState(false);

  const fetchItems = () => {
    api.get("/item/all").then((r) => setItems(r.data)).catch(() => {});
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/item/create", {
        title: form.title,
        description: form.description || undefined,
        basePrice: parseFloat(form.basePrice),
      });
      showToast("Item created", "success");
      setForm({ title: "", description: "", basePrice: "" });
      setShowCreate(false);
      fetchItems();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string, title: string) => {
    if (!confirm(`Delete item "${title}"?`)) return;
    try {
      await api.delete(`/item/delete/${itemId}`);
      showToast("Item deleted", "success");
      fetchItems();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed", "error");
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return "badge-success";
      case "SOLD": return "badge-danger";
      default: return "badge-accent";
    }
  };

  return (
    <div className="container page fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Item Management</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Item"}
        </button>
      </div>

      {showCreate && (
        <div className="card fade-in" style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>New Item</h3>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input className="input" placeholder="Item title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="input" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="input mono" type="number" placeholder="Base price" required value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="loader" /> : "Create"}
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Base Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.title}</td>
                <td style={{ color: "var(--muted)" }}>{item.description || "—"}</td>
                <td className="mono">${item.basePrice.toLocaleString()}</td>
                <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
                <td>
                  <button className="btn btn-danger" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }} onClick={() => handleDelete(item.id, item.title)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
