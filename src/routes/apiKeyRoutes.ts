import { Router } from "express";
import { authenticate, syncUser } from "../middleware/auth";
import * as apiKeyController from "../controllers/apiKeyController";

const router = Router();

// All API key routes require authentication
router.use(authenticate);
router.use(syncUser);

router.post("/:brandId/api-keys", apiKeyController.createApiKey);
router.get("/:brandId/api-keys", apiKeyController.listApiKeys);
router.post("/:brandId/api-keys/:keyId/disable", apiKeyController.disableApiKey);

export default router;
