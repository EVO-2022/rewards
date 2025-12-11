import { Request, Response } from "express";
import { rewardsEngine } from "../services/rewardsEngine";
import { fraudDetection } from "../services/fraudDetection";
import { z } from "zod";
import { prisma } from "../utils/prisma";

const issuePointsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

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

    // Run fraud checks
    await fraudDetection.runFraudChecks(brandId, data.userId, data.amount);

    // Mint points
    const ledger = await rewardsEngine.mintPoints(
      brandId,
      data.userId,
      data.amount,
      data.reason || "manual_issue",
      data.metadata
    );

    res.status(201).json(ledger);
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
