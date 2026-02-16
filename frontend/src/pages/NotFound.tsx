import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem",
    }}>
      <h1 style={{ fontSize: "4rem", color: "var(--accent)" }}>404</h1>
      <p style={{ color: "var(--muted)" }}>Page not found</p>
      <Link to="/" className="btn btn-outline">Go Home</Link>
    </div>
  );
}
