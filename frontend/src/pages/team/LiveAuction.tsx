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
  itemImageUrl?: string | null;
  paused?: boolean;
  currentWinner?: string | null;
}

export default function LiveAuction() {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();
  const [auction, setAuction] = useState<AuctionStatus>({ active: false });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [result, setResult] = useState<any>(null);

  // Fetch initial state
  useEffect(() => {
    api.get("/auction/status").then((r) => setAuction(r.data)).catch(() => {});
    api.get("/auction/timer").then((r) => {
      if (r.data.active) setTimeRemaining(r.data.timeRemaining);
    }).catch(() => {});
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("auction:start", (data) => {
      setAuction({ active: true, id: data.auctionId, phase: "OPEN", itemTitle: "" });
      setTimeRemaining(data.timeRemaining);
      setResult(null);
      showToast("Auction started!", "success");
      api.get("/auction/status").then((r) => setAuction(r.data)).catch(() => {});
    });

    socket.on("auction:timer", (data) => {
      setTimeRemaining(data.timeRemaining);
      if (data.phase) {
        setAuction((prev) => ({ ...prev, phase: data.phase }));
      }
    });

    socket.on("auction:reveal", () => {
      api.get("/auction/status").then((r) => setAuction(r.data)).catch(() => {});
      showToast("Bidding round complete!", "success");
    });

    socket.on("auction:finalPhase", (data) => {
      setAuction((prev) => ({ ...prev, phase: "FINAL" }));
      setTimeRemaining(data.timeRemaining);
      showToast("Final phase started!", "success");
    });

    socket.on("auction:paused", () => {
      setAuction((prev) => ({ ...prev, paused: true }));
    });

    socket.on("auction:resumed", () => {
      setAuction((prev) => ({ ...prev, paused: false }));
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
      socket.off("auction:reveal");
      socket.off("auction:finalPhase");
      socket.off("auction:paused");
      socket.off("auction:resumed");
      socket.off("auction:result");
      socket.off("auction:closed");
      socket.off("team:eliminated");
    };
  }, [socket, user?.teamId, refreshUser]);

  if (user?.isEliminated) {
    return (
      <div className="container page fade-in" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h1 style={{ color: "var(--danger)" }}>Eliminated</h1>
        <p style={{ color: "var(--muted)", marginTop: "1rem" }}>Your team has won an item and is no longer participating.</p>
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
              <p style={{ fontSize: "1.5rem", fontWeight: 600 }}>{result.winner.teamName}</p>
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
        {/* Timer - only show during OPEN and FINAL */}
        {(auction.phase === "OPEN" || auction.phase === "FINAL") && (
          <div style={{ textAlign: "center" }}>
            <Timer timeRemaining={timeRemaining} phase={auction.phase} />
            {auction.paused && (
              <div style={{ marginTop: "0.5rem", color: "#EAB308", fontWeight: 600 }}>PAUSED</div>
            )}
          </div>
        )}

        {/* Item info */}
        {auction.itemTitle && (
          <div className="card" style={{ textAlign: "center", width: "100%", maxWidth: "500px" }}>
            {auction.itemImageUrl && (
              <img
                src={auction.itemImageUrl}
                alt={auction.itemTitle}
                style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, marginBottom: "0.75rem" }}
              />
            )}
            <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Current Item</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "0.25rem" }}>{auction.itemTitle}</div>
          </div>
        )}

        {/* Phase status */}
        <div className="card" style={{ textAlign: "center", width: "100%", maxWidth: "500px" }}>
          {auction.phase === "OPEN" && (
            <>
              <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--accent)" }}>Bidding in Progress</div>
              <div style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
                Teams are placing their bids with the admin
              </div>
            </>
          )}

          {auction.phase === "REVEAL" && (
            <>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>Current Leader</div>
              {auction.currentWinner ? (
                <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--accent)" }}>
                  {auction.currentWinner}
                </div>
              ) : (
                <div style={{ color: "var(--muted)" }}>No bids placed</div>
              )}
              <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
                Waiting for final phase to begin...
              </div>
            </>
          )}

          {auction.phase === "FINAL" && (
            <>
              <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--danger)" }}>Final Phase</div>
              <div style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
                Last chance to update bids!
              </div>
            </>
          )}
        </div>

        {/* Balance */}
        <div className="card" style={{ textAlign: "center", width: "100%", maxWidth: "500px" }}>
          <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Your Balance</div>
          <div className="mono" style={{ fontSize: "1.5rem", color: "var(--success)", marginTop: "0.25rem" }}>
            ${user?.money?.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
