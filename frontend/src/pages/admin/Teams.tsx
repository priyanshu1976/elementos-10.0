import { useEffect, useState, FormEvent } from "react";
import api from "../../lib/api";
import { showToast } from "../../components/Toast";

interface Team {
  id: string;
  name: string;
  money: number;
  isEliminated: boolean;
  user: { email: string } | null;
  _count: { bids: number };
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", leaderEmail: "", password: "", money: "10000" });
  const [loading, setLoading] = useState(false);

  const fetchTeams = () => {
    api.get("/admin/teams").then((r) => setTeams(r.data)).catch(() => {});
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/admin/create-team", {
        ...form,
        money: parseFloat(form.money),
      });
      showToast("Team created", "success");
      setForm({ name: "", leaderEmail: "", password: "", money: "10000" });
      setShowCreate(false);
      fetchTeams();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to create team", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teamId: string, name: string) => {
    if (!confirm(`Delete team "${name}"?`)) return;
    try {
      await api.delete(`/admin/team/${teamId}`);
      showToast("Team deleted", "success");
      fetchTeams();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed", "error");
    }
  };

  const handleEliminate = async (teamId: string) => {
    try {
      await api.patch(`/team/eliminate/${teamId}`);
      showToast("Team eliminated", "success");
      fetchTeams();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed", "error");
    }
  };

  return (
    <div className="container page fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Team Management</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Team"}
        </button>
      </div>

      {showCreate && (
        <div className="card fade-in" style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>New Team</h3>
          <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <input className="input" placeholder="Team name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" type="email" placeholder="Leader email" required value={form.leaderEmail} onChange={(e) => setForm({ ...form, leaderEmail: e.target.value })} />
            <input className="input" type="password" placeholder="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input className="input mono" type="number" placeholder="Starting money" value={form.money} onChange={(e) => setForm({ ...form, money: e.target.value })} />
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ gridColumn: "span 2" }}>
              {loading ? <span className="loader" /> : "Create"}
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Money</th>
              <th>Bids</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id}>
                <td style={{ fontWeight: 600 }}>{team.name}</td>
                <td style={{ color: "var(--muted)" }}>{team.user?.email || "—"}</td>
                <td className="mono">${team.money.toLocaleString()}</td>
                <td className="mono">{team._count.bids}</td>
                <td>
                  <span className={`badge ${team.isEliminated ? "badge-danger" : "badge-success"}`}>
                    {team.isEliminated ? "Eliminated" : "Active"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {!team.isEliminated && (
                      <button className="btn btn-outline" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }} onClick={() => handleEliminate(team.id)}>
                        Eliminate
                      </button>
                    )}
                    <button className="btn btn-danger" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }} onClick={() => handleDelete(team.id, team.name)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
