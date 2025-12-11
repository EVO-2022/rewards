import { Router } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { rewardsEngine } from "../services/rewardsEngine";
import { fraudDetection } from "../services/fraudDetection";

const router = Router();

// All integration routes require API key auth
router.use(apiKeyAuth);

// Test endpoint to verify API key authentication
router.get("/whoami", async (req, res) => {
  try {
    const auth = req.integrationAuth;
    if (!auth) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      brandId: auth.brandId,
      apiKeyId: auth.apiKeyId,
      status: "ok",
    });
  } catch (error) {
    console.error("Whoami error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Find or create a user for integration
 * Uses integration clerkId pattern: integration_{brandId}_{externalUserId}
 */
async function findOrCreateIntegrationUser(
  brandId: string,
  externalUserId: string
): Promise<{ id: string }> {
  // Create integration user with special clerkId pattern
  const integrationClerkId = `integration_${brandId}_${externalUserId}`;
  
  // Check if user already exists with this clerkId
  const existingIntegrationUser = await prisma.user.findUnique({
    where: { clerkId: integrationClerkId },
  });

  if (existingIntegrationUser) {
    return existingIntegrationUser;
  }

  // Create new user
  return await prisma.user.create({
    data: {
      clerkId: integrationClerkId,
      email: null,
    },
  });
}

const issuePointsSchema = z.object({
  externalUserId: z.string().min(1, "externalUserId is required and must be non-empty"),
  points: z.number().positive("points must be a positive number"),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

router.post("/points/issue", validate(issuePointsSchema), async (req, res) => {
  try {
    const brandId = req.integrationAuth!.brandId;
    const apiKeyId = req.integrationAuth!.apiKeyId;
    const data = issuePointsSchema.parse(req.body);

    // Find or create user by externalUserId
    const user = await findOrCreateIntegrationUser(brandId, data.externalUserId);

    // Run fraud checks
    await fraudDetection.runFraudChecks(brandId, user.id, data.points);

    // Issue points using rewards engine
    const ledger = await rewardsEngine.mintPoints(
      brandId,
      user.id,
      data.points,
      data.reason || "integration_issue",
      {
        externalUserId: data.externalUserId,
        source: "api_integration",
        apiKeyId: apiKeyId,
        ...(data.metadata || {}),
      }
    );

    // Get updated balance
    const newBalance = await rewardsEngine.getUserBalance(brandId, user.id);

    res.status(201).json({
      status: "ok",
      brandId,
      userId: user.id,
      externalUserId: data.externalUserId,
      pointsIssued: data.points,
      newBalance,
      ledgerEntryId: ledger.id,
    });
  } catch (error) {
    console.error("Integration issue points error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
    res.status(500).json({ error: "Failed to issue points" });
  }
});

router.get("/users/:externalUserId/balance", async (req, res) => {
  try {
    const brandId = req.integrationAuth!.brandId;
    const { externalUserId } = req.params;

    // Find user by integration clerkId pattern
    const integrationClerkId = `integration_${brandId}_${externalUserId}`;
    const user = await prisma.user.findUnique({
      where: { clerkId: integrationClerkId },
    });

    // If user doesn't exist, return balance 0
    if (!user) {
      return res.json({
        brandId,
        externalUserId,
        userId: undefined,
        balance: 0,
      });
    }

    // Get balance
    const balance = await rewardsEngine.getUserBalance(brandId, user.id);

    res.json({
      brandId,
      externalUserId,
      userId: user.id,
      balance,
    });
  } catch (error) {
    console.error("Integration get balance error:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

export default router;

