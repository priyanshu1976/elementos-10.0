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

interface LiveBidData {
  auction: { id: string; phase: string; itemTitle: string } | null;
  bids: Array<{ id: string; teamName: string; amount: number; timestamp: string }>;
}

export default function AuctionControl() {
  const { socket } = useSocket();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [auctionStatus, setAuctionStatus] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [liveBids, setLiveBids] = useState<LiveBidData>({ auction: null, bids: [] });
  const [loading, setLoading] = useState(false);

  const fetchState = () => {
    api.get("/item/all").then((r) => setItems(r.data.filter((i: Item) => i.status !== "SOLD"))).catch(() => {});
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
    });

    socket.on("auction:start", () => fetchState());
    socket.on("auction:finalPhase", () => fetchState());
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
      socket.off("auction:finalPhase");
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

  return (
    <div className="container page fade-in">
      <h1 style={{ marginBottom: "2rem" }}>Auction Control Panel</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Controls */}
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Controls</h3>

          {!auctionStatus?.active ? (
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
                <span className="badge badge-success">{auctionStatus.phase}</span>
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
          {auctionStatus?.active ? (
            <Timer timeRemaining={timeRemaining} phase={auctionStatus.phase} />
          ) : (
            <div style={{ color: "var(--muted)", textAlign: "center" }}>
              <p>No active auction</p>
            </div>
          )}
        </div>
      </div>

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
