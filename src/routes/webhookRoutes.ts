import { Router } from "express";
import { authenticate, syncUser, requireBrandAccess } from "../middleware/auth";
import * as webhookController from "../controllers/webhookController";

const router = Router();

// All webhook routes require authentication and brand access
router.use(authenticate);
router.use(syncUser);

router.get("/:brandId/webhooks", requireBrandAccess(), webhookController.listWebhooks);
router.post("/:brandId/webhooks", requireBrandAccess(), webhookController.createWebhook);
router.delete(
  "/:brandId/webhooks/:webhookId",
  requireBrandAccess(),
  webhookController.deleteWebhook
);

export default router;
