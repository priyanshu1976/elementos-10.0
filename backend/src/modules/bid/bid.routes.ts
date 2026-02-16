import { Router } from "express";
import * as bidController from "./bid.controller";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { z } from "zod";

const router = Router();

const bidSchema = z.object({
  amount: z.number().positive(),
});

// Team-only bid actions
router.post("/place", authenticate, requireRole("TEAM"), validate(bidSchema), bidController.placeBid);
router.patch("/update", authenticate, requireRole("TEAM"), validate(bidSchema), bidController.updateBid);

// Authenticated users
router.get("/current-highest", authenticate, bidController.getCurrentHighest);
router.get("/team", authenticate, requireRole("TEAM"), bidController.getTeamBid);
router.get("/history/:auctionId", authenticate, bidController.getBidHistory);

export default router;
