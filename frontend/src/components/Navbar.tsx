import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <nav style={{
      background: "var(--secondary)",
      borderBottom: "1px solid var(--border)",
      padding: "0.75rem 1.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link to="/" style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: "1.1rem",
          color: "var(--accent)",
        }}>
          Auction
        </Link>

        {user.role === "TEAM" && (
          <>
            <Link to="/dashboard" className="btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid var(--border)", color: "var(--text)" }}>Dashboard</Link>
            <Link to="/auction" className="btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid var(--border)", color: "var(--text)" }}>Live Auction</Link>
            <Link to="/history" className="btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid var(--border)", color: "var(--text)" }}>History</Link>
          </>
        )}

        {user.role === "ADMIN" && (
          <>
            <Link to="/admin" className="btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid var(--border)", color: "var(--text)" }}>Dashboard</Link>
            <Link to="/admin/teams" className="btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid var(--border)", color: "var(--text)" }}>Teams</Link>
            <Link to="/admin/items" className="btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid var(--border)", color: "var(--text)" }}>Items</Link>
            <Link to="/admin/auction" className="btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid var(--border)", color: "var(--text)" }}>Auction Control</Link>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {user.role === "TEAM" && user.money !== null && (
          <span className="mono" style={{ color: "var(--success)", fontWeight: 600 }}>
            ${user.money.toLocaleString()}
          </span>
        )}
        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          {user.email}
        </span>
        <span className={`badge ${user.role === "ADMIN" ? "badge-accent" : "badge-success"}`}>
          {user.role}
        </span>
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
