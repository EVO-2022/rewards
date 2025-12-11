import express from "express";
import cors from "cors";
import morgan from "morgan";

import { authenticate, syncUser } from "./middleware/auth";

import brandRoutes from "./routes/brandRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import pointsRoutes from "./routes/pointsRoutes";
import apiKeyRoutes from "./routes/apiKeyRoutes";
import integrationRoutes from "./routes/integrationRoutes";
import * as brandController from "./controllers/brandController";
import * as pointsController from "./controllers/pointsController";
import * as redemptionController from "./controllers/redemptionController";
import { validate } from "./middleware/validation";
import { z } from "zod";

export function createApp() {
  const app = express();

  // Core middleware (must run first)
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  // Mount integration routes EARLY - before any Clerk/auth middleware
  // Integration routes use API key auth only, never Clerk
  app.use("/api/integration", integrationRoutes);

  // Authentication middleware - applies to all routes except health check, test routes, and integration routes
  app.use((req, res, next) => {
    // Skip auth for health check
    if (req.path === "/health") {
      return next();
    }
    
    // Skip auth for integration routes (they use API key auth)
    if (req.path.startsWith("/api/integration")) {
      return next();
    }
    
    // Skip auth for test routes ONLY when SMOKE_TEST_BYPASS is enabled
    if (process.env.SMOKE_TEST_BYPASS === "true" && 
        (req.path.startsWith("/api/__test") || req.path.startsWith("/__test"))) {
      console.log("⚠️ TEST ROUTE BYPASS (SMOKE_TEST_BYPASS=true):", req.path);
      return next();
    }
    
    // Apply authentication to all other routes
    return authenticate(req, res, next);
  });

  // Sync authenticated users to database (runs after auth)
  app.use((req, res, next) => {
    // Skip sync for health check, integration routes, and test routes
    if (req.path === "/health" || 
        req.path.startsWith("/api/integration") ||
        (process.env.SMOKE_TEST_BYPASS === "true" && 
         (req.path.startsWith("/api/__test") || req.path.startsWith("/__test")))) {
      return next();
    }
    // Only sync if user is authenticated
    if (req.auth?.userId) {
      return syncUser(req, res, next);
    }
    return next();
  });

  // Health check
  app.get("/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 🔒 TEST ROUTE - Only works when SMOKE_TEST_BYPASS=true (for automated testing)
  const createBrandSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    description: z.string().optional(),
  });
  app.post("/api/__test/create-brand", validate(createBrandSchema), async (req, res) => {
    // This route is only accessible when SMOKE_TEST_BYPASS=true
    // The auth middleware above will skip auth for this path when the env var is set
    try {
      console.log("🔧 TEST ROUTE HIT:", { 
        path: req.path, 
        method: req.method,
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
        userId: testUser.id,
        email: testUser.email || "test@smoke.test",
      };

      return brandController.createBrand(req, res);
    } catch (error) {
      console.error("❌ Test route error:", error);
      return res.status(500).json({ 
        error: "Failed to setup test user", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // 🔒 TEST ROUTES FOR POINTS OPERATIONS - Only works when SMOKE_TEST_BYPASS=true
  const issuePointsSchema = z.object({
    userId: z.string().uuid(),
    amount: z.number().positive(),
    reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  });

  app.post("/api/__test/brands/:brandId/points/issue", validate(issuePointsSchema), async (req, res) => {
    try {
      // Ensure test user exists and inject auth
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
      }

      (req as any).auth = {
        userId: testUser.id,
        email: testUser.email || "test@smoke.test",
      };

      return pointsController.issuePoints(req, res);
    } catch (error) {
      console.error("❌ Test route error:", error);
      return res.status(500).json({ 
        error: "Failed to setup test user for points", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Test route for balance check
  app.get("/api/__test/brands/:brandId/points/balance/:userId", async (req, res) => {
    try {
      // Ensure test user exists and inject auth
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
      }

      (req as any).auth = {
        userId: testUser.id,
        email: testUser.email || "test@smoke.test",
      };

      return pointsController.getUserBalance(req, res);
    } catch (error) {
      console.error("❌ Test route error:", error);
      return res.status(500).json({ 
        error: "Failed to setup test user for balance", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Test route for API key creation
  app.post("/api/__test/brands/:brandId/api-keys", async (req, res) => {
    // Guard: only allow when SMOKE_TEST_BYPASS is enabled
    if (process.env.SMOKE_TEST_BYPASS !== "true") {
      return res.status(403).json({ error: "Test routes disabled" });
    }

    try {
      const { brandId } = req.params;
      const name = req.body.name || "Test Key";

      // Use shared service to create API key
      const { createBrandApiKeyForBrandId } = await import("./services/apiKeyService");
      const { brandApiKey, apiKey } = await createBrandApiKeyForBrandId(brandId, name);

      return res.status(201).json({
        id: brandApiKey.id,
        brandId: brandApiKey.brandId,
        name: brandApiKey.name,
        isActive: brandApiKey.isActive,
        createdAt: brandApiKey.createdAt.toISOString(),
        lastUsedAt: brandApiKey.lastUsedAt?.toISOString() || null,
        apiKey, // RAW key, only in this response
      });
    } catch (error) {
      console.error("❌ Test route error:", error);
      if (error instanceof Error && error.message === "Brand not found") {
        return res.status(404).json({ error: "Brand not found" });
      }
      return res.status(500).json({
        error: "Failed to create API key",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Test route for redemption
  const createRedemptionSchema = z.object({
    userId: z.string().uuid(),
    campaignId: z.string().uuid().optional(),
    pointsUsed: z.number().positive(),
    metadata: z.record(z.any()).optional(),
  });

  app.post("/api/__test/brands/:brandId/redemptions", validate(createRedemptionSchema), async (req, res) => {
    try {
      // Ensure test user exists and inject auth
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
      }

      (req as any).auth = {
        userId: testUser.id,
        email: testUser.email || "test@smoke.test",
      };

      return redemptionController.createRedemption(req, res);
    } catch (error) {
      console.error("❌ Test route error:", error);
      return res.status(500).json({ 
        error: "Failed to setup test user for redemption", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // API routes (Clerk-protected)
  app.use("/api/brands", brandRoutes);
  app.use("/api/brands", apiKeyRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api", pointsRoutes);
  // Note: /api/integration is mounted earlier, before auth middleware

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