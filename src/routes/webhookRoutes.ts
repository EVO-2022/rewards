import { Router } from "express";
import { webhookRateLimit } from "../middleware/rateLimit";
import * as webhookController from "../controllers/webhookController";

const router = Router();

// Webhook ingestion - no auth required, but rate limited
router.post("/ingest", webhookRateLimit, webhookController.ingestWebhook);

export default router;

