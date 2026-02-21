import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { AppError } from "./lib/errors";
import authRoutes from "./modules/auth/auth.routes";
import teamRoutes from "./modules/team/team.routes";
import adminRoutes from "./modules/admin/admin.routes";
import itemRoutes from "./modules/item/item.routes";
import auctionRoutes from "./modules/auction/auction.routes";
import bidRoutes from "./modules/bid/bid.routes";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// General rate limit: 100 requests per 15 minutes per IP
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok!!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/bid", bidRoutes);

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

export default app;
