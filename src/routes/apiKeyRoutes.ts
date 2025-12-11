import { Router } from "express";
import { adminAuth, requireBrandAccess } from "../middleware/auth";
import * as apiKeyController from "../controllers/apiKeyController";

const router = Router();

// All API key routes require admin auth and brand access
router.post("/:brandId/api-keys", adminAuth, requireBrandAccess(), apiKeyController.createApiKey);
router.get("/:brandId/api-keys", adminAuth, requireBrandAccess(), apiKeyController.listApiKeys);
router.post("/:brandId/api-keys/:keyId/disable", adminAuth, requireBrandAccess(), apiKeyController.disableApiKey);

export default router;
