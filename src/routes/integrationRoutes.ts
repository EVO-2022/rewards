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

const issuePointsSchema = z.object({
  externalUserId: z.string().min(1),
  email: z.string().email().optional(),
  amount: z.number().positive(),
  reason: z.string().optional(),
});

/**
 * Find or create a user for integration
 * Uses email if provided, otherwise creates with integration clerkId pattern
 */
async function findOrCreateIntegrationUser(
  brandId: string,
  externalUserId: string,
  email?: string
): Promise<{ id: string }> {
  // Try to find by email first if provided
  if (email) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return existingUser;
    }
  }

  // Create integration user with special clerkId pattern
  const integrationClerkId = `integration_${brandId}_${externalUserId}`;
  
  // Check if user already exists with this clerkId
  const existingIntegrationUser = await prisma.user.findUnique({
    where: { clerkId: integrationClerkId },
  });

  if (existingIntegrationUser) {
    // Update email if provided and different
    if (email && existingIntegrationUser.email !== email) {
      return await prisma.user.update({
        where: { id: existingIntegrationUser.id },
        data: { email },
      });
    }
    return existingIntegrationUser;
  }

  // Create new user
  return await prisma.user.create({
    data: {
      clerkId: integrationClerkId,
      email: email || null,
    },
  });
}

router.post("/points/issue", validate(issuePointsSchema), async (req, res) => {
  try {
    const brandId = req.brandIntegration!.brandId;
    const data = issuePointsSchema.parse(req.body);

    // Find or create user
    const user = await findOrCreateIntegrationUser(
      brandId,
      data.externalUserId,
      data.email
    );

    // Run fraud checks
    await fraudDetection.runFraudChecks(brandId, user.id, data.amount);

    // Issue points
    const ledger = await rewardsEngine.mintPoints(
      brandId,
      user.id,
      data.amount,
      data.reason || "integration_issue",
      {
        externalUserId: data.externalUserId,
        source: "api_integration",
      }
    );

    // Get updated balance
    const newBalance = await rewardsEngine.getUserBalance(brandId, user.id);

    res.status(201).json({
      brandId,
      userId: user.id,
      externalUserId: data.externalUserId,
      amount: data.amount,
      newBalance,
      ledgerEntryId: ledger.id,
    });
  } catch (error) {
    console.error("Integration issue points error:", error);
    res.status(500).json({ error: "Failed to issue points" });
  }
});

router.get("/users/:externalUserId/balance", async (req, res) => {
  try {
    const brandId = req.brandIntegration!.brandId;
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

