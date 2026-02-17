import { useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import api from "../../lib/api";
import Timer from "../../components/Timer";
import { showToast } from "../../components/Toast";

interface Item {
  id: string;
  title: string;
  basePrice: number;
  status: string;
}

interface Team {
  id: string;
  name: string;
  money: number;
  isEliminated: boolean;
}

interface LiveBidData {
  auction: { id: string; phase: string; itemTitle: string } | null;
  bids: Array<{ id: string; teamName: string; amount: number; timestamp: string }>;
}

interface AuctionStatus {
  active: boolean;
  id?: string;
  phase?: string;
  itemTitle?: string;
  itemImageUrl?: string | null;
  paused?: boolean;
  currentWinner?: string | null;
}

export default function AuctionControl() {
  const { socket } = useSocket();
  const [items, setItems] = useState<Item[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [auctionStatus, setAuctionStatus] = useState<AuctionStatus>({ active: false });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [liveBids, setLiveBids] = useState<LiveBidData>({ auction: null, bids: [] });
  const [loading, setLoading] = useState(false);

  // Bid form state
  const [selectedTeam, setSelectedTeam] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bidLoading, setBidLoading] = useState(false);

  const fetchState = () => {
    api.get("/item/all").then((r) => setItems(r.data.filter((i: Item) => i.status !== "SOLD"))).catch(() => {});
    api.get("/admin/teams").then((r) => setTeams(r.data.filter((t: Team) => !t.isEliminated))).catch(() => {});
    api.get("/auction/status").then((r) => setAuctionStatus(r.data)).catch(() => {});
    api.get("/auction/timer").then((r) => {
      if (r.data.active) setTimeRemaining(r.data.timeRemaining);
    }).catch(() => {});
    api.get("/admin/bids/live").then((r) => setLiveBids(r.data)).catch(() => {});
  };

  useEffect(() => { fetchState(); }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("auction:timer", (data) => {
      setTimeRemaining(data.timeRemaining);
      if (data.phase) {
        setAuctionStatus((prev) => ({ ...prev, phase: data.phase }));
      }
    });

    socket.on("auction:start", () => fetchState());
    socket.on("auction:reveal", () => {
      fetchState();
      showToast("OPEN phase ended - Current winner revealed!", "success");
    });
    socket.on("auction:finalPhase", () => {
      fetchState();
      showToast("Final phase started!", "success");
    });
    socket.on("auction:paused", () => {
      setAuctionStatus((prev) => ({ ...prev, paused: true }));
      showToast("Auction paused", "success");
    });
    socket.on("auction:resumed", () => {
      setAuctionStatus((prev) => ({ ...prev, paused: false }));
      showToast("Auction resumed", "success");
    });
    socket.on("auction:result", () => {
      fetchState();
      showToast("Auction completed!", "success");
    });
    socket.on("bid:update", () => {
      api.get("/admin/bids/live").then((r) => setLiveBids(r.data)).catch(() => {});
    });

    return () => {
      socket.off("auction:timer");
      socket.off("auction:start");
      socket.off("auction:reveal");
      socket.off("auction:finalPhase");
      socket.off("auction:paused");
      socket.off("auction:resumed");
      socket.off("auction:result");
      socket.off("bid:update");
    };
  }, [socket]);

  const handleStart = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      await api.post("/auction/start", { itemId: selectedItem });
      showToast("Auction started!", "success");
      fetchState();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to start", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await api.post("/auction/stop");
      showToast("Auction stopped", "success");
      fetchState();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await api.post("/auction/pause");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to pause", "error");
    }
  };

  const handleResume = async () => {
    try {
      await api.post("/auction/resume");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to resume", "error");
    }
  };

  const handleStartFinal = async () => {
    setLoading(true);
    try {
      await api.post("/auction/start-final");
      showToast("Final phase started!", "success");
      fetchState();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedTeam || !bidAmount) return;
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) return;

    setBidLoading(true);
    try {
      await api.post("/admin/bid/place", { teamId: selectedTeam, amount });
      const team = teams.find((t) => t.id === selectedTeam);
      showToast(`Bid placed for ${team?.name}: $${amount.toLocaleString()}`, "success");
      setBidAmount("");
      setSelectedTeam("");
      api.get("/admin/bids/live").then((r) => setLiveBids(r.data)).catch(() => {});
    } catch (err: any) {
      showToast(err.response?.data?.error || "Bid failed", "error");
    } finally {
      setBidLoading(false);
    }
  };

  const phase = auctionStatus.phase;
  const isPaused = auctionStatus.paused;

  return (
    <div className="container page fade-in">
      <h1 style={{ marginBottom: "2rem" }}>Auction Control Panel</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Controls */}
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Controls</h3>

          {!auctionStatus.active ? (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.25rem", color: "var(--muted)", fontSize: "0.85rem" }}>
                  Select Item
                </label>
                <select
                  className="input"
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                >
                  <option value="">Choose an item...</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} (${item.basePrice})
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleStart}
                disabled={!selectedItem || loading}
                style={{ width: "100%" }}
              >
                {loading ? <span className="loader" /> : "Start Auction"}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Item</div>
                <div style={{ fontWeight: 600 }}>{auctionStatus.itemTitle}</div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Phase</div>
                <span className={`badge ${phase === "REVEAL" ? "badge-warning" : "badge-success"}`}>
                  {phase}{isPaused ? " (PAUSED)" : ""}
                </span>
              </div>

              {/* Current Winner (visible in REVEAL phase) */}
              {phase === "REVEAL" && auctionStatus.currentWinner && (
                <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "var(--glass)", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Current Winner</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--accent)", marginTop: "0.25rem" }}>
                    {auctionStatus.currentWinner}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                {/* Pause/Resume - only during OPEN or FINAL */}
                {(phase === "OPEN" || phase === "FINAL") && (
                  isPaused ? (
                    <button className="btn btn-primary" onClick={handleResume} style={{ flex: 1 }}>
                      Resume
                    </button>
                  ) : (
                    <button className="btn" onClick={handlePause} style={{ flex: 1, background: "#EAB308", color: "#000" }}>
                      Pause
                    </button>
                  )
                )}

                {/* Start Final Phase - only in REVEAL */}
                {phase === "REVEAL" && (
                  <button
                    className="btn btn-primary"
                    onClick={handleStartFinal}
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    {loading ? <span className="loader" /> : "Start Final Phase (1 min)"}
                  </button>
                )}
              </div>

              <button
                className="btn btn-danger"
                onClick={handleStop}
                disabled={loading}
                style={{ width: "100%" }}
              >
                {loading ? <span className="loader" /> : "Force Stop"}
              </button>
            </>
          )}
        </div>

        {/* Timer */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {auctionStatus.active && phase !== "REVEAL" ? (
            <>
              <Timer timeRemaining={timeRemaining} phase={phase || "OPEN"} />
              {isPaused && (
                <div style={{ marginTop: "0.5rem", color: "#EAB308", fontWeight: 600 }}>PAUSED</div>
              )}
            </>
          ) : phase === "REVEAL" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.5rem" }}>
                OPEN Phase Complete
              </div>
              <div style={{ color: "var(--muted)" }}>
                Click "Start Final Phase" to begin the last 1 minute
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", textAlign: "center" }}>
              <p>No active auction</p>
            </div>
          )}
        </div>
      </div>

      {/* Place Bid for Team - only during active auction */}
      {auctionStatus.active && phase !== "CLOSED" && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Place Bid for Team</h3>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "0.25rem", color: "var(--muted)", fontSize: "0.85rem" }}>
                Team
              </label>
              <select
                className="input"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">Select team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} (${team.money.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "0.25rem", color: "var(--muted)", fontSize: "0.85rem" }}>
                Amount
              </label>
              <input
                type="number"
                className="input mono"
                placeholder="Bid amount"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min="0"
                step="100"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handlePlaceBid}
              disabled={bidLoading || !selectedTeam || !bidAmount}
              style={{ whiteSpace: "nowrap" }}
            >
              {bidLoading ? <span className="loader" /> : "Place Bid"}
            </button>
          </div>
        </div>
      )}

      {/* Live bids */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Live Bids</h3>
        {liveBids.bids.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No bids yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Amount</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {liveBids.bids.map((bid, i) => (
                <tr key={bid.id}>
                  <td className="mono" style={{ color: i === 0 ? "var(--success)" : "var(--muted)" }}>#{i + 1}</td>
                  <td style={{ fontWeight: i === 0 ? 600 : 400 }}>{bid.teamName}</td>
                  <td className="mono" style={{ color: i === 0 ? "var(--accent)" : "var(--text)" }}>
                    ${bid.amount.toLocaleString()}
                  </td>
                  <td style={{ color: "var(--muted)" }}>{new Date(bid.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
