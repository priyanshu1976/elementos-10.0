import { Router } from "express";
import * as teamController from "./team.controller";
import { authenticate, requireRole } from "../../middleware/auth";

const router = Router();

// Team endpoints (require TEAM role)
router.get("/profile", authenticate, requireRole("TEAM"), teamController.getProfile);
router.get("/money", authenticate, requireRole("TEAM"), teamController.getMoney);
router.get("/status", authenticate, requireRole("TEAM"), teamController.getStatus);
router.get("/history", authenticate, requireRole("TEAM"), teamController.getHistory);

// Admin can eliminate a team
router.patch("/eliminate/:teamId", authenticate, requireRole("ADMIN"), teamController.eliminate);

export default router;
