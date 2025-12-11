import { Router } from "express";
import { adminAuth, requireBrandAccess } from "../middleware/auth";
import * as webhookController from "../controllers/webhookController";

const router = Router();

// All webhook routes require admin auth and brand access
router.get("/:brandId/webhooks", adminAuth, requireBrandAccess(), webhookController.listWebhooks);
router.post("/:brandId/webhooks", adminAuth, requireBrandAccess(), webhookController.createWebhook);
router.delete(
  "/:brandId/webhooks/:webhookId",
  adminAuth,
  requireBrandAccess(),
  webhookController.deleteWebhook
);

export default router;
