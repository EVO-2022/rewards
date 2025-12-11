import { Router } from "express";
import brandRoutes from "./brandRoutes";
import teamRoutes from "./teamRoutes";
import campaignRoutes from "./campaignRoutes";
import pointsRoutes from "./pointsRoutes";
import redemptionRoutes from "./redemptionRoutes";
import fraudRoutes from "./fraudRoutes";
import webhookRoutes from "./webhookRoutes";
import adminRoutes from "./adminRoutes";
import * as brandController from "../controllers/brandController";
import { validate } from "../middleware/validation";
import { z } from "zod";

const router = Router();

const createBrandSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

router.use("/brands", brandRoutes);
router.use("/brands", teamRoutes);
router.use("/brands", campaignRoutes);
router.use("/brands", pointsRoutes);
router.use("/brands", redemptionRoutes);
router.use("/brands", fraudRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/admin", adminRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 🔒 TEMPORARY TEST ROUTE - Unauthenticated brand creation for smoke testing
// This bypasses ALL auth and admin middleware
// TODO: Remove after smoke test verification
router.post("/__test/create-brand", validate(createBrandSchema), async (req, res) => {
  // Inject fake auth for controller (controller expects req.auth.userId)
  (req as any).auth = {
    userId: "test-smoke-user-id",
    email: "test@smoke.test",
  };
  return brandController.createBrand(req, res);
});

export default router;
