import { Request, Response } from "express";
import { rewardsEngine } from "../services/rewardsEngine";
import { fraudDetection } from "../services/fraudDetection";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { LedgerType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const issuePointsSchema = z.object({
  userId: z.string().uuid().optional(),
  externalUserId: z.string().min(1).optional(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).refine((data) => data.userId || data.externalUserId, {
  message: "Either userId or externalUserId must be provided",
});

// Helper to find or create integration user
async function findOrCreateIntegrationUser(
  brandId: string,
  externalUserId: string
): Promise<{ id: string }> {
  const integrationClerkId = `integration_${brandId}_${externalUserId}`;
  
  // Try to find existing user
  const existing = await prisma.user.findUnique({
    where: { clerkId: integrationClerkId },
  });
  
  if (existing) {
    return existing;
  }
  
  // Create new user
  return await prisma.user.create({
    data: {
      clerkId: integrationClerkId,
      email: null,
    },
  });
}

const burnPointsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const issuePoints = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const data = issuePointsSchema.parse(req.body);
    const actorUserId = req.auth?.userId || null;

    // Resolve userId from externalUserId if provided
    let targetUserId: string;
    if (data.userId) {
      targetUserId = data.userId;
    } else if (data.externalUserId) {
      const user = await findOrCreateIntegrationUser(brandId, data.externalUserId);
      targetUserId = user.id;
    } else {
      return res.status(400).json({ error: "Either userId or externalUserId must be provided" });
    }

    // Use transaction to ensure fraud checks and ledger creation are atomic
    const ledger = await prisma.$transaction(async (tx) => {
      // Run fraud checks (these may create fraud flags, so include in transaction)
      await fraudDetection.runFraudChecks(brandId, targetUserId, data.amount);

      // Create ledger entry directly in transaction
      const ledgerEntry = await tx.rewardLedger.create({
        data: {
          brandId,
          userId: targetUserId,
          type: LedgerType.MINT,
          amount: new Decimal(data.amount),
          reason: data.reason || "Issued points",
          metadata: {
            ...(data.metadata || {}),
            actorUserId: actorUserId,
            source: "admin_issue_points",
            ...(data.externalUserId ? { externalUserId: data.externalUserId } : {}),
          },
        },
      });

      return ledgerEntry;
    });

    res.status(201).json({
      ...ledger,
      id: ledger.id,
      ok: true,
    });
  } catch (error) {
    console.error("Issue points error:", error);
    res.status(500).json({ error: "Failed to issue points" });
  }
};

export const burnPoints = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const data = burnPointsSchema.parse(req.body);

    // Check balance
    const hasBalance = await rewardsEngine.hasSufficientBalance(brandId, data.userId, data.amount);

    if (!hasBalance) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Burn points
    const ledger = await rewardsEngine.burnPoints(
      brandId,
      data.userId,
      data.amount,
      data.reason || "manual_burn",
      data.metadata
    );

    res.status(201).json(ledger);
  } catch (error) {
    console.error("Burn points error:", error);
    res.status(500).json({ error: "Failed to burn points" });
  }
};

export const getUserBalance = async (req: Request, res: Response) => {
  try {
    const { brandId, userId } = req.params;

    const balance = await rewardsEngine.getUserBalance(brandId, userId);

    res.json({ balance, userId, brandId });
  } catch (error) {
    console.error("Get user balance error:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
};

export const getLedgerHistory = async (req: Request, res: Response) => {
  try {
    const { brandId, userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const ledgers = await prisma.rewardLedger.findMany({
      where: {
        brandId,
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    res.json(ledgers);
  } catch (error) {
    console.error("Get ledger history error:", error);
    res.status(500).json({ error: "Failed to fetch ledger history" });
  }
};
