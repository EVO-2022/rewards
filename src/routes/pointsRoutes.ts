import { Router } from "express";
import { authenticate, requireBrandAccess, syncUser } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import * as pointsController from "../controllers/pointsController";

const router = Router({ mergeParams: true });

const issuePointsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const burnPointsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// All routes require authentication and user sync
router.use(authenticate);
router.use(syncUser);
router.use("/:brandId", requireBrandAccess("MANAGER"));

router.post("/:brandId/points/issue", validate(issuePointsSchema), pointsController.issuePoints);
router.post("/:brandId/points/burn", validate(burnPointsSchema), pointsController.burnPoints);
router.get("/:brandId/points/balance/:userId", requireBrandAccess(), pointsController.getUserBalance);
router.get("/:brandId/points/ledger/:userId", requireBrandAccess(), pointsController.getLedgerHistory);

export default router;

