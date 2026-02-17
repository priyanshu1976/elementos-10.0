import { Router } from "express";
import * as itemController from "./item.controller";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { z } from "zod";

const router = Router();

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  basePrice: z.number().positive(),
});

const updateItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  basePrice: z.number().positive().optional(),
  status: z.enum(["PENDING", "ACTIVE", "SOLD"]).optional(),
});

// Admin-only mutations
router.post("/create", authenticate, requireRole("ADMIN"), validate(createItemSchema), itemController.createItem);
router.patch("/update/:itemId", authenticate, requireRole("ADMIN"), validate(updateItemSchema), itemController.updateItem);
router.delete("/delete/:itemId", authenticate, requireRole("ADMIN"), itemController.deleteItem);

// Authenticated users can view items
router.get("/current", authenticate, itemController.getCurrentItem);
router.get("/all", authenticate, itemController.getAllItems);

export default router;
