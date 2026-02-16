import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../lib/api";

interface TeamProfile {
  id: string;
  name: string;
  money: number;
  isEliminated: boolean;
}

interface BidHistory {
  id: string;
  amount: number;
  timestamp: string;
  itemTitle: string;
  auctionPhase: string;
}

export default function TeamDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [history, setHistory] = useState<BidHistory[]>([]);

  useEffect(() => {
    api.get("/team/profile").then((r) => setProfile(r.data)).catch(() => {});
    api.get("/team/history").then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  if (user?.isEliminated) {
    return (
      <div className="container page fade-in" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h1 style={{ color: "var(--danger)", marginBottom: "1rem" }}>Eliminated</h1>
        <p style={{ color: "var(--muted)" }}>Your team has been eliminated from the auction.</p>
      </div>
    );
  }

  return (
    <div className="container page fade-in">
      <h1 style={{ marginBottom: "2rem" }}>Team Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>Team</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{profile?.name || user?.teamName}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>Balance</div>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--success)" }}>
            ${profile?.money?.toLocaleString() ?? user?.money?.toLocaleString() ?? "0"}
          </div>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>Status</div>
          <span className={`badge ${profile?.isEliminated ? "badge-danger" : "badge-success"}`}>
            {profile?.isEliminated ? "Eliminated" : "Active"}
          </span>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem" }}>Bid History</h2>
      {history.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No bids placed yet.</p>
      ) : (
        <div className="card" style={{ overflow: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Amount</th>
                <th>Phase</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((bid) => (
                <tr key={bid.id}>
                  <td>{bid.itemTitle}</td>
                  <td className="mono">${bid.amount.toLocaleString()}</td>
                  <td><span className="badge badge-accent">{bid.auctionPhase}</span></td>
                  <td style={{ color: "var(--muted)" }}>{new Date(bid.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
