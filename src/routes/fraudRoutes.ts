import { Router } from "express";
import { authenticate, requireBrandAccess, syncUser } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import { FraudStatus } from "@prisma/client";
import * as fraudController from "../controllers/fraudController";

const router = Router({ mergeParams: true });

const reviewFraudFlagSchema = z.object({
  status: z.nativeEnum(FraudStatus),
});

// All routes require authentication and user sync
router.use(authenticate);
router.use(syncUser);
router.use("/:brandId", requireBrandAccess("MANAGER"));

router.get("/:brandId/fraud", fraudController.getFraudFlags);
router.get("/:brandId/fraud/:flagId", fraudController.getFraudFlag);
router.patch(
  "/:brandId/fraud/:flagId/review",
  validate(reviewFraudFlagSchema),
  fraudController.reviewFraudFlag
);

export default router;
