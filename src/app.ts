import express from "express";
import cors from "cors";
import morgan from "morgan";

import { authenticate } from "./middleware/auth";

import brandRoutes from "./routes/brandRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import pointsRoutes from "./routes/pointsRoutes";
import * as brandController from "./controllers/brandController";
import { validate } from "./middleware/validation";
import { z } from "zod";

export function createApp() {
  const app = express();

  // Core middleware
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  // 🔒 SMOKE TEST BYPASS - Must run BEFORE auth middleware
  app.use((req, _res, next) => {
    if (
      process.env.SMOKE_TEST_BYPASS === "true" &&
      req.path.startsWith("/api/__test")
    ) {
      console.log("✅ GLOBAL TEST BYPASS HIT BEFORE AUTH");
      return next();
    }
    next();
  });

  // 🚨 HARD GLOBAL AUTH KILL SWITCH - TEMPORARY FOR SMOKE TESTING
  if (process.env.SMOKE_TEST_BYPASS !== "true") {
    app.use(authenticate);
  } else {
    console.log("🚨 GLOBAL AUTH DISABLED FOR SMOKE TEST");
  }

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

// 🔒 TEMPORARY TEST ROUTE - Unauthenticated brand creation for smoke testing
// This bypasses ALL auth and admin middleware
// TODO: Remove after smoke test verification
const createBrandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});
app.post("/__test/create-brand", validate(createBrandSchema), async (req, res) => {
  // Inject fake auth for controller (controller expects req.auth.userId)
  (req as any).auth = {
    userId: "test-smoke-user-id",
    email: "test@smoke.test",
  };
  return brandController.createBrand(req, res);
});
  return app;
}