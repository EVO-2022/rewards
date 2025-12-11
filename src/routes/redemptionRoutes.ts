import { Router } from "express";
import { authenticate, requireBrandAccess, syncUser } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import * as redemptionController from "../controllers/redemptionController";

const router = Router({ mergeParams: true });

const createRedemptionSchema = z.object({
  userId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  pointsUsed: z.number().positive(),
  metadata: z.record(z.any()).optional(),
});

// All routes require authentication and user sync
router.use(authenticate);
router.use(syncUser);
router.use("/:brandId", requireBrandAccess());

router.post(
  "/:brandId/redemptions",
  validate(createRedemptionSchema),
  redemptionController.createRedemption
);
router.get("/:brandId/redemptions", redemptionController.getRedemptions);
router.get("/:brandId/redemptions/:redemptionId", redemptionController.getRedemption);
router.patch("/:brandId/redemptions/:redemptionId/cancel", redemptionController.cancelRedemption);

export default router;
