import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import api from "../../lib/api";
import Timer from "../../components/Timer";
import { showToast } from "../../components/Toast";

interface AuctionStatus {
  active: boolean;
  id?: string;
  phase?: string;
  itemTitle?: string;
}

interface HighestBid {
  amount: number;
  teamName: string;
  timestamp: string;
}

export default function LiveAuction() {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();
  const [auction, setAuction] = useState<AuctionStatus>({ active: false });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [highest, setHighest] = useState<HighestBid | null>(null);
  const [myBid, setMyBid] = useState<number | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidLoading, setBidLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Fetch initial state
  useEffect(() => {
    api.get("/auction/status").then((r) => setAuction(r.data)).catch(() => {});
    api.get("/auction/timer").then((r) => {
      if (r.data.active) setTimeRemaining(r.data.timeRemaining);
    }).catch(() => {});
    api.get("/bid/current-highest").then((r) => {
      if (r.data?.highest) setHighest(r.data.highest);
    }).catch(() => {});
    api.get("/bid/team").then((r) => {
      if (r.data?.amount) setMyBid(r.data.amount);
    }).catch(() => {});
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("auction:start", (data) => {
      setAuction({ active: true, id: data.auctionId, phase: "OPEN", itemTitle: "" });
      setTimeRemaining(data.timeRemaining);
      setHighest(null);
      setMyBid(null);
      setResult(null);
      showToast("Auction started!", "success");
      // Refetch auction status for item title
      api.get("/auction/status").then((r) => setAuction(r.data)).catch(() => {});
    });

    socket.on("auction:timer", (data) => {
      setTimeRemaining(data.timeRemaining);
      if (data.phase) {
        setAuction((prev) => ({ ...prev, phase: data.phase }));
      }
    });

    socket.on("auction:finalPhase", (data) => {
      setAuction((prev) => ({ ...prev, phase: "FINAL" }));
      setTimeRemaining(data.timeRemaining);
      showToast("Final phase! Rebid now!", "success");
    });

    socket.on("bid:update", (data) => {
      // Another team placed a bid
      showToast(`${data.teamName} placed a bid`, "success");
    });

    socket.on("bid:highest", (data) => {
      setHighest(data);
    });

    socket.on("auction:result", (data) => {
      setAuction((prev) => ({ ...prev, active: false, phase: "CLOSED" }));
      setResult(data);
      refreshUser();
      if (data.winner?.teamId === user?.teamId) {
        showToast("You won the auction!", "success");
      }
    });

    socket.on("auction:closed", () => {
      setAuction((prev) => ({ ...prev, phase: "CLOSED" }));
    });

    socket.on("team:eliminated", () => {
      showToast("Your team has been eliminated", "error");
      refreshUser();
    });

    return () => {
      socket.off("auction:start");
      socket.off("auction:timer");
      socket.off("auction:finalPhase");
      socket.off("bid:update");
      socket.off("bid:highest");
      socket.off("auction:result");
      socket.off("auction:closed");
      socket.off("team:eliminated");
    };
  }, [socket, user?.teamId, refreshUser]);

  const handleBid = async (isUpdate: boolean) => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) return;

    setBidLoading(true);
    try {
      if (isUpdate) {
        await api.patch("/bid/update", { amount });
      } else {
        await api.post("/bid/place", { amount });
      }
      setMyBid(amount);
      setBidAmount("");
      showToast(`Bid ${isUpdate ? "updated" : "placed"}: $${amount.toLocaleString()}`, "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Bid failed", "error");
    } finally {
      setBidLoading(false);
    }
  };

  if (user?.isEliminated) {
    return (
      <div className="container page fade-in" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h1 style={{ color: "var(--danger)" }}>Eliminated</h1>
        <p style={{ color: "var(--muted)", marginTop: "1rem" }}>You can no longer bid.</p>
      </div>
    );
  }

  if (!auction.active && !result) {
    return (
      <div className="container page fade-in" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h1 style={{ marginBottom: "1rem" }}>Live Auction</h1>
        <p style={{ color: "var(--muted)" }}>No auction is currently active. Please wait for the admin to start one.</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="container page fade-in" style={{ textAlign: "center", paddingTop: "2rem" }}>
        <h1 style={{ marginBottom: "2rem" }}>Auction Result</h1>
        <div className="card" style={{ maxWidth: "500px", margin: "0 auto" }}>
          {result.winner ? (
            <>
              <h2 style={{ color: "var(--success)", marginBottom: "1rem" }}>Winner</h2>
              <p style={{ fontSize: "1.25rem" }}>{result.winner.teamName}</p>
              <p className="mono" style={{ fontSize: "2rem", color: "var(--accent)", margin: "0.5rem 0" }}>
                ${result.winner.amount.toLocaleString()}
              </p>
            </>
          ) : (
            <p style={{ color: "var(--muted)" }}>No winner - no bids were placed.</p>
          )}
          {result.losers?.length > 0 && (
            <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <h3 style={{ color: "var(--muted)", marginBottom: "0.5rem" }}>Penalties</h3>
              {result.losers.map((l: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
                  <span>{l.teamName}</span>
                  <span className="mono" style={{ color: "var(--danger)" }}>-${l.penalty.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container page fade-in">
      <h1 style={{ marginBottom: "2rem", textAlign: "center" }}>Live Auction</h1>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}>
        {/* Timer */}
        <Timer timeRemaining={timeRemaining} phase={auction.phase || "OPEN"} />

        {/* Item info */}
        {auction.itemTitle && (
          <div className="card" style={{ textAlign: "center", width: "100%", maxWidth: "500px" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Current Item</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "0.25rem" }}>{auction.itemTitle}</div>
          </div>
        )}

        {/* Highest bid */}
        <div className="card" style={{ textAlign: "center", width: "100%", maxWidth: "500px" }}>
          <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            {auction.phase === "OPEN" ? "Bids are hidden" : "Highest Bid"}
          </div>
          {auction.phase !== "OPEN" && highest ? (
            <>
              <div className="mono pulse" style={{ fontSize: "2rem", color: "var(--accent)", marginTop: "0.5rem" }}>
                ${highest.amount.toLocaleString()}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{highest.teamName}</div>
            </>
          ) : (
            <div style={{ color: "var(--muted)", marginTop: "0.5rem" }}>Will be revealed after OPEN phase</div>
          )}
        </div>

        {/* My bid */}
        {myBid !== null && (
          <div className="card" style={{ textAlign: "center", width: "100%", maxWidth: "500px" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Your Bid</div>
            <div className="mono" style={{ fontSize: "1.5rem", color: "var(--success)", marginTop: "0.25rem" }}>
              ${myBid.toLocaleString()}
            </div>
          </div>
        )}

        {/* Bid form */}
        <div className="card" style={{ width: "100%", maxWidth: "500px" }}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input
              type="number"
              className="input mono"
              placeholder="Enter bid amount"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              min="0"
              step="100"
            />
            {myBid === null ? (
              <button
                className="btn btn-primary"
                onClick={() => handleBid(false)}
                disabled={bidLoading || !bidAmount}
                style={{ whiteSpace: "nowrap" }}
              >
                {bidLoading ? <span className="loader" /> : "Place Bid"}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => handleBid(true)}
                disabled={bidLoading || !bidAmount}
                style={{ whiteSpace: "nowrap" }}
              >
                {bidLoading ? <span className="loader" /> : "Update Bid"}
              </button>
            )}
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
            Balance: <span className="mono">${user?.money?.toLocaleString()}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
