import { Router } from "express";
import { authenticate, requireBrandAccess, syncUser } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import * as campaignController from "../controllers/campaignController";

const router = Router({ mergeParams: true });

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  pointsPerDollar: z.number().min(0).default(1.0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  pointsPerDollar: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// All routes require authentication and user sync
router.use(authenticate);
router.use(syncUser);
router.use("/:brandId", requireBrandAccess("MANAGER"));

router.post("/:brandId/campaigns", validate(createCampaignSchema), campaignController.createCampaign);
router.get("/:brandId/campaigns", requireBrandAccess(), campaignController.getCampaigns);
router.get("/:brandId/campaigns/:campaignId", requireBrandAccess(), campaignController.getCampaign);
router.patch("/:brandId/campaigns/:campaignId", validate(updateCampaignSchema), campaignController.updateCampaign);
router.delete("/:brandId/campaigns/:campaignId", campaignController.deleteCampaign);

export default router;

