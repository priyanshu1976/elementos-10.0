import { useState, FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--primary)",
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: "400px" }}>
        <h1 style={{
          textAlign: "center",
          marginBottom: "0.5rem",
          color: "var(--accent)",
          fontSize: "1.5rem",
        }}>
          Auction Platform
        </h1>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "2rem", fontSize: "0.85rem" }}>
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: "var(--muted)" }}>
              Email
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: "var(--muted)" }}>
              Password
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div style={{
              padding: "0.75rem",
              background: "rgba(255, 77, 79, 0.1)",
              border: "1px solid var(--danger)",
              borderRadius: "8px",
              color: "var(--danger)",
              fontSize: "0.85rem",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? <span className="loader" /> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
