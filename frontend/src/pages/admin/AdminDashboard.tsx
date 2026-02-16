import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

export default function AdminDashboard() {
  const [teamCount, setTeamCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [auctionStatus, setAuctionStatus] = useState<any>(null);

  useEffect(() => {
    api.get("/admin/teams").then((r) => setTeamCount(r.data.length)).catch(() => {});
    api.get("/item/all").then((r) => setItemCount(r.data.length)).catch(() => {});
    api.get("/auction/status").then((r) => setAuctionStatus(r.data)).catch(() => {});
  }, []);

  return (
    <div className="container page fade-in">
      <h1 style={{ marginBottom: "2rem" }}>Admin Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>Teams</div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 600 }}>{teamCount}</div>
          <Link to="/admin/teams" style={{ fontSize: "0.8rem", marginTop: "0.5rem", display: "block" }}>Manage teams</Link>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>Items</div>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 600 }}>{itemCount}</div>
          <Link to="/admin/items" style={{ fontSize: "0.8rem", marginTop: "0.5rem", display: "block" }}>Manage items</Link>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>Auction</div>
          <span className={`badge ${auctionStatus?.active ? "badge-success" : "badge-danger"}`}>
            {auctionStatus?.active ? `Active (${auctionStatus.phase})` : "Inactive"}
          </span>
          <Link to="/admin/auction" style={{ fontSize: "0.8rem", marginTop: "0.5rem", display: "block" }}>Control panel</Link>
        </div>
      </div>
    </div>
  );
}
