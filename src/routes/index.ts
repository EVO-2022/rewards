import { Router } from "express";
import brandRoutes from "./brandRoutes";
import teamRoutes from "./teamRoutes";
import campaignRoutes from "./campaignRoutes";
import pointsRoutes from "./pointsRoutes";
import redemptionRoutes from "./redemptionRoutes";
import fraudRoutes from "./fraudRoutes";
import webhookRoutes from "./webhookRoutes";
import adminRoutes from "./adminRoutes";

const router = Router();

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

export default router;

