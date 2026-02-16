import { Router } from "express";
import * as auctionController from "./auction.controller";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { z } from "zod";

const router = Router();

const startSchema = z.object({
  itemId: z.string().min(1),
});

const restartSchema = z.object({
  itemId: z.string().min(1),
});

// Admin-only
router.post("/start", authenticate, requireRole("ADMIN"), validate(startSchema), auctionController.start);
router.post("/stop", authenticate, requireRole("ADMIN"), auctionController.stop);
router.post("/restart", authenticate, requireRole("ADMIN"), validate(restartSchema), auctionController.restart);

// Authenticated
router.get("/status", authenticate, auctionController.status);
router.get("/timer", authenticate, auctionController.timer);
router.get("/result/:auctionId", authenticate, auctionController.result);

export default router;
