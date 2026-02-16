import { Router } from "express";
import * as adminController from "./admin.controller";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { z } from "zod";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole("ADMIN"));

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  leaderEmail: z.string().email(),
  password: z.string().min(6),
  money: z.number().positive().optional(),
});

const updateMoneySchema = z.object({
  money: z.number().min(0),
});

router.post("/create-team", validate(createTeamSchema), adminController.createTeam);
router.get("/teams", adminController.getTeams);
router.patch("/team-money/:teamId", validate(updateMoneySchema), adminController.updateTeamMoney);
router.delete("/team/:teamId", adminController.deleteTeam);
router.get("/bids/live", adminController.getLiveBids);

export default router;
