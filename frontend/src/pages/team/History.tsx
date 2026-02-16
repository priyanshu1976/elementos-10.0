import { useEffect, useState } from "react";
import api from "../../lib/api";

interface BidHistory {
  id: string;
  amount: number;
  timestamp: string;
  itemTitle: string;
  auctionPhase: string;
}

export default function History() {
  const [history, setHistory] = useState<BidHistory[]>([]);

  useEffect(() => {
    api.get("/team/history").then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  return (
    <div className="container page fade-in">
      <h1 style={{ marginBottom: "2rem" }}>Bid History</h1>

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
                <th>Timestamp</th>
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
