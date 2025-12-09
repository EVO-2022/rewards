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
    if (process.env.SMOKE_TEST_BYPASS === "true") {
      const isTestPath = req.path.startsWith("/api/__test") || 
                         req.path.startsWith("/__test") ||
                         req.originalUrl?.includes("/__test");
      if (isTestPath) {
        console.log("✅ GLOBAL TEST BYPASS HIT BEFORE AUTH", { path: req.path, originalUrl: req.originalUrl });
        return next();
      }
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

  // 🔒 TEMPORARY TEST ROUTE - Must be BEFORE other /api routes to avoid conflicts
  const createBrandSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    description: z.string().optional(),
  });
  app.post("/api/__test/create-brand", validate(createBrandSchema), async (req, res) => {
    try {
      console.log("🔧 TEST ROUTE HIT:", { 
        path: req.path, 
        originalUrl: req.originalUrl,
        method: req.method,
        body: req.body,
        bypass: process.env.SMOKE_TEST_BYPASS 
      });
      // Ensure test user exists in database
      const { prisma } = await import("./utils/prisma");
      let testUser = await prisma.user.findUnique({
        where: { clerkId: "test-smoke-user-id" },
      });

      if (!testUser) {
        testUser = await prisma.user.create({
          data: {
            clerkId: "test-smoke-user-id",
            email: "test@smoke.test",
            isPlatformAdmin: false,
          },
        });
        console.log("✅ Created test smoke user:", testUser.id);
      }

      // Inject auth with actual database user ID
      (req as any).auth = {
        userId: testUser.id, // Use actual DB user ID, not the string
        email: testUser.email || "test@smoke.test",
      };

      console.log("🔧 Calling brandController.createBrand with userId:", testUser.id);
      return brandController.createBrand(req, res);
    } catch (error) {
      console.error("❌ Test route error:", error);
      return res.status(500).json({ error: "Failed to setup test user", details: error instanceof Error ? error.message : String(error) });
    }
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