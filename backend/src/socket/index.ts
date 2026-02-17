import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../lib/jwt";
import { setCallbacks, AuctionState, AuctionResult } from "../modules/auction/auction.engine";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;

    // Join role-based rooms
    socket.join(user.role);
    if (user.teamId) {
      socket.join(`team:${user.teamId}`);
    }

    socket.on("disconnect", () => {
      // cleanup if needed
    });
  });

  // Set up auction engine callbacks to emit socket events
  setCallbacks({
    onTick: (state: AuctionState) => {
      io?.emit("auction:timer", {
        phase: state.phase,
        timeRemaining: state.timeRemaining,
      });
    },
    onPhaseChange: (state: AuctionState) => {
      if (state.phase === "OPEN") {
        if (state.paused === true) {
          io?.emit("auction:paused", { auctionId: state.auctionId, phase: state.phase });
        } else if (state.paused === false) {
          io?.emit("auction:resumed", { auctionId: state.auctionId, phase: state.phase });
        } else {
          io?.emit("auction:start", {
            auctionId: state.auctionId,
            itemId: state.itemId,
            phase: state.phase,
            timeRemaining: state.timeRemaining,
          });
        }
      } else if (state.phase === "REVEAL") {
        io?.emit("auction:reveal", {
          auctionId: state.auctionId,
        });
      } else if (state.phase === "FINAL") {
        if (state.paused === true) {
          io?.emit("auction:paused", { auctionId: state.auctionId, phase: state.phase });
        } else if (state.paused === false) {
          io?.emit("auction:resumed", { auctionId: state.auctionId, phase: state.phase });
        } else {
          io?.emit("auction:finalPhase", {
            auctionId: state.auctionId,
            phase: state.phase,
            timeRemaining: state.timeRemaining,
          });
        }
      } else if (state.phase === "CLOSED") {
        io?.emit("auction:closed", {
          auctionId: state.auctionId,
        });
      }
    },
    onResult: (result: AuctionResult) => {
      io?.emit("auction:result", result);

      if (result.winner) {
        io?.to(`team:${result.winner.teamId}`).emit("team:eliminated", {
          teamId: result.winner.teamId,
          reason: "Won the auction",
        });
      }
    },
  });

  return io;
}

export function emitBidUpdate(data: {
  teamName: string;
  amount: number;
  auctionId: string;
}) {
  io?.emit("bid:update", data);
}

export function emitBidHighest(data: {
  teamName: string;
  amount: number;
  auctionId: string;
}) {
  io?.emit("bid:highest", data);
}

export function getIO(): Server | null {
  return io;
}
