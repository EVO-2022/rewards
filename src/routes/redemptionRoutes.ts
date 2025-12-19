import { Router } from "express";
import { adminAuth, requireBrandAccess } from "../middleware/auth";
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

// Create redemption (MUTATING) -> MANAGER+
router.post(
  "/:brandId/redemptions",
  adminAuth,
  requireBrandAccess("MANAGER"),
  validate(createRedemptionSchema),
  redemptionController.createRedemption
);

// View redemptions -> VIEWER+
router.get(
  "/:brandId/redemptions",
  adminAuth,
  requireBrandAccess(),
  redemptionController.getRedemptions
);

router.get(
  "/:brandId/redemptions/:redemptionId",
  adminAuth,
  requireBrandAccess(),
  redemptionController.getRedemption
);

// Cancel redemption (MUTATING) -> MANAGER+
router.patch(
  "/:brandId/redemptions/:redemptionId/cancel",
  adminAuth,
  requireBrandAccess("MANAGER"),
  redemptionController.cancelRedemption
);

export default router;