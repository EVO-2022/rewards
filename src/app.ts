import express from "express";
import cors from "cors";
import morgan from "morgan";

// 🔴 AUTH TEMPORARILY DISABLED FOR LOCAL DEV
// import { authenticate } from "./middleware/auth";

import brandRoutes from "./routes/brandRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import pointsRoutes from "./routes/pointsRoutes";

export function createApp() {
  const app = express();

  // Core middleware
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  // 🔴 DISABLED GLOBAL AUTH FOR LOCAL DEV
  // app.use(authenticate);

  // Health check
  app.get("/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API routes
  app.use("/api/brands", brandRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api", pointsRoutes);

// ✅ HARD DEV BYPASS: direct brand access with ZERO auth or middleware
app.get("/__dev/brands", async (_req, res) => {
  const brands = await (await import("./utils/prisma")).prisma.brand.findMany();
  res.json(brands);
});
// ✅ HARD DEV BYPASS: direct balance check (no auth)
app.get("/__dev/balance", async (req, res) => {
  const { email, brandId } = req.query as {
    email?: string;
    brandId?: string;
  };

  if (!email || !brandId) {
    return res.status(400).json({ error: "email and brandId are required" });
  }

  const { prisma } = await import("./utils/prisma");

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const ledger = await prisma.rewardLedger.findMany({
    where: {
      userId: user.id,
      brandId,
    },
  });

  const balance = ledger.reduce((sum, r) => sum + Number(r.amount), 0);

  res.json({
    email,
    brandId,
    balance,
  });
});
  return app;
}