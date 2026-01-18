import { Router } from "express";
import { authenticate, syncUser } from "../middleware/auth";
import { rewardsEngine } from "../services/rewardsEngine";
import { prisma } from "../utils/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

const router = Router({ mergeParams: true });

// Portal routes - authenticated users can view their own data
router.use(authenticate);
router.use(syncUser);

// Get current user's balance for a brand
router.get("/:brandId/balance", async (req: any, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.auth?.userId; // Database user ID from syncUser

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify user has access to this brand (any role)
    const membership = await prisma.brandMember.findUnique({
      where: {
        userId_brandId: {
          userId,
          brandId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: "Access denied to this brand" });
    }

    const balance = await rewardsEngine.getUserBalance(brandId, userId);

    res.json({ balance, userId, brandId });
  } catch (error) {
    console.error("Portal balance error:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// Create redemption for current user (portal)
const portalRedeemSchema = z.object({
  pointsUsed: z.number().positive(),
  metadata: z.record(z.any()).optional(),
});

router.post("/:brandId/redeem", async (req: any, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.auth?.userId; // Database user ID from syncUser - NEVER from client

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Parse and validate request body (NO userId allowed)
    const data = portalRedeemSchema.parse(req.body);
    const { pointsUsed, metadata } = data;

    // Verify user has access to this brand (any role)
    const membership = await prisma.brandMember.findUnique({
      where: {
        userId_brandId: {
          userId,
          brandId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: "Access denied to this brand" });
    }

    // Run transaction-safe redemption logic (same as admin redemption)
    const result = await prisma.$transaction(async (tx) => {
      // Check balance INSIDE the transaction
      const hasBalance = await rewardsEngine.hasSufficientBalance(
        brandId,
        userId, // Use req.auth.userId, never client-supplied
        pointsUsed,
        tx
      );

      if (!hasBalance) {
        const err: any = new Error("INSUFFICIENT_BALANCE");
        err.code = "INSUFFICIENT_BALANCE";
        throw err;
      }

      // Create redemption (pending)
      const redemption = await tx.redemption.create({
        data: {
          brandId,
          userId, // Use req.auth.userId
          campaignId: null,
          pointsUsed: new Decimal(pointsUsed),
          status: "pending",
          metadata: metadata || {},
        },
      });

      // Burn points (ledger write) in same tx with portal source
      await rewardsEngine.burnPoints(
        brandId,
        userId, // Use req.auth.userId
        pointsUsed,
        "redemption",
        {
          redemptionId: redemption.id,
          source: "portal_redemption",
          actorUserId: userId, // For portal, actor = user (self-service)
          ...(metadata || {}),
        },
        tx
      );

      // Mark completed in same tx
      const updatedRedemption = await tx.redemption.update({
        where: { id: redemption.id },
        data: { status: "completed" },
      });

      return updatedRedemption;
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error?.code === "INSUFFICIENT_BALANCE" || error?.message === "INSUFFICIENT_BALANCE") {
      return res.status(400).json({ error: "Insufficient balance" });
    }
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Portal redeem error:", error);
    res.status(500).json({ error: "Failed to create redemption" });
  }
});

export default router;
