import { Router } from "express";
import { authenticate, syncUser, requireBrandAccess } from "../middleware/auth";
import {
  listWebhooks,
  createWebhook,
  deleteWebhook,
} from "../controllers/webhookController";

const router = Router();

// NOTE: Inbound webhook receiver is not implemented yet.
// Routes here currently only manage webhook subscriptions.

// All webhook routes require authentication and brand access
router.use(authenticate);
router.use(syncUser);

router.get("/:brandId/webhooks", requireBrandAccess(), listWebhooks);
router.post("/:brandId/webhooks", requireBrandAccess(), createWebhook);
router.delete(
  "/:brandId/webhooks/:webhookId",
  requireBrandAccess(),
  deleteWebhook
);

export default router;
