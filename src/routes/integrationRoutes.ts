import { Router } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { rewardsEngine } from "../services/rewardsEngine";
import { fraudDetection } from "../services/fraudDetection";
import { LedgerType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

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
 * Find integration user by externalUserId
 * Uses integration clerkId pattern: integration_{brandId}_{externalUserId}
 * Returns null if user doesn't exist (doesn't create)
 */
async function findIntegrationUser(
  brandId: string,
  externalUserId: string
): Promise<{ id: string } | null> {
  const integrationClerkId = `integration_${brandId}_${externalUserId}`;
  
  return await prisma.user.findUnique({
    where: { clerkId: integrationClerkId },
  });
}

/**
 * Find or create a user for integration
 * Uses integration clerkId pattern: integration_{brandId}_{externalUserId}
 */
async function findOrCreateIntegrationUser(
  brandId: string,
  externalUserId: string
): Promise<{ id: string }> {
  // Try to find existing user first
  const existing = await findIntegrationUser(brandId, externalUserId);
  if (existing) {
    return existing;
  }

  // Create new user
  const integrationClerkId = `integration_${brandId}_${externalUserId}`;
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

// Balance check endpoint with query parameter
const balanceQuerySchema = z.object({
  externalUserId: z.string().min(1, "externalUserId is required and must be non-empty"),
});

router.get("/points/balance", async (req, res) => {
  try {
    const { brandId } = req.integrationAuth!;
    
    // Validate query parameters
    const queryParams = balanceQuerySchema.safeParse(req.query);
    
    if (!queryParams.success) {
      return res.status(400).json({
        error: "Validation error",
        details: queryParams.error.errors,
      });
    }

    const { externalUserId } = queryParams.data;

    // Find user by externalUserId (don't create if doesn't exist)
    const user = await findIntegrationUser(brandId, externalUserId);

    // If user doesn't exist, return balance 0 (not an error)
    if (!user) {
      return res.json({
        status: "ok",
        brandId,
        userId: null,
        externalUserId,
        balance: 0,
      });
    }

    // Get balance using existing service
    const balance = await rewardsEngine.getUserBalance(brandId, user.id);

    res.json({
      status: "ok",
      brandId,
      userId: user.id,
      externalUserId,
      balance,
    });
  } catch (error) {
    console.error("Integration get balance error:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// Redemption endpoint
const redeemPointsSchema = z.object({
  externalUserId: z.string().min(1, "externalUserId is required and must be non-empty"),
  points: z.number().int("points must be an integer").positive("points must be a positive integer"),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

router.post("/points/redeem", validate(redeemPointsSchema), async (req, res) => {
  try {
    const { brandId, apiKeyId } = req.integrationAuth!;
    const data = redeemPointsSchema.parse(req.body);

    // Find or create user by externalUserId
    const user = await findOrCreateIntegrationUser(brandId, data.externalUserId);

    // Get current balance
    const currentBalance = await rewardsEngine.getUserBalance(brandId, user.id);

    // Check if user has sufficient balance
    if (data.points > currentBalance) {
      return res.status(400).json({
        status: "error",
        code: "INSUFFICIENT_POINTS",
        message: "User does not have enough points to redeem",
        required: data.points,
        available: currentBalance,
      });
    }

    // Perform atomic transaction: create redemption + burn points
    const result = await prisma.$transaction(async (tx) => {
      // Create redemption record
      const redemption = await tx.redemption.create({
        data: {
          brandId,
          userId: user.id,
          campaignId: null,
          pointsUsed: new Decimal(data.points),
          status: "completed",
          metadata: {
            externalUserId: data.externalUserId,
            source: "api_integration",
            apiKeyId: apiKeyId,
            reason: data.reason || "integration_redeem",
            ...(data.metadata || {}),
          },
        },
      });

      // Create ledger entry (burn points)
      const ledger = await tx.rewardLedger.create({
        data: {
          brandId,
          userId: user.id,
          type: LedgerType.BURN,
          amount: new Decimal(data.points),
          reason: data.reason || "integration_redeem",
          metadata: {
            redemptionId: redemption.id,
            externalUserId: data.externalUserId,
            source: "api_integration",
            apiKeyId: apiKeyId,
            ...(data.metadata || {}),
          },
        },
      });

      return { redemption, ledger };
    });

    // Calculate new balance (currentBalance - points)
    const newBalance = currentBalance - data.points;

    res.status(200).json({
      status: "ok",
      brandId,
      userId: user.id,
      externalUserId: data.externalUserId,
      pointsRedeemed: data.points,
      newBalance,
      redemptionId: result.redemption.id,
      ledgerEntryId: result.ledger.id,
    });
  } catch (error) {
    console.error("Integration redeem points error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_REQUEST",
        message: "Validation error",
        details: error.errors,
      });
    }
    res.status(500).json({
      status: "error",
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    });
  }
});

// Legacy endpoint (path parameter) - kept for backward compatibility
router.get("/users/:externalUserId/balance", async (req, res) => {
  try {
    const brandId = req.integrationAuth!.brandId;
    const { externalUserId } = req.params;

    // Find user by integration clerkId pattern
    const user = await findIntegrationUser(brandId, externalUserId);

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

