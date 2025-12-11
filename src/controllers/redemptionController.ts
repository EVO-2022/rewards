import { Request, Response } from "express";
import { rewardsEngine } from "../services/rewardsEngine";
import { prisma } from "../utils/prisma";
import { z } from "zod";

const createRedemptionSchema = z.object({
  userId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  pointsUsed: z.number().positive(),
  metadata: z.record(z.any()).optional(),
});

export const createRedemption = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const data = createRedemptionSchema.parse(req.body);

    // Check balance
    const hasBalance = await rewardsEngine.hasSufficientBalance(
      brandId,
      data.userId,
      data.pointsUsed
    );

    if (!hasBalance) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Create redemption
    const redemption = await prisma.redemption.create({
      data: {
        brandId,
        userId: data.userId,
        campaignId: data.campaignId || null,
        pointsUsed: data.pointsUsed,
        status: "pending",
        metadata: data.metadata || {},
      },
    });

    // Burn points
    await rewardsEngine.burnPoints(brandId, data.userId, data.pointsUsed, "redemption", {
      redemptionId: redemption.id,
      campaignId: data.campaignId,
    });

    // Update redemption status
    const updatedRedemption = await prisma.redemption.update({
      where: { id: redemption.id },
      data: { status: "completed" },
    });

    res.status(201).json(updatedRedemption);
  } catch (error) {
    console.error("Create redemption error:", error);
    res.status(500).json({ error: "Failed to create redemption" });
  }
};

export const getRedemptions = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.query.userId as string | undefined;

    const where: any = { brandId };
    if (userId) {
      where.userId = userId;
    }

    const redemptions = await prisma.redemption.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        campaign: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    res.json(redemptions);
  } catch (error) {
    console.error("Get redemptions error:", error);
    res.status(500).json({ error: "Failed to fetch redemptions" });
  }
};

export const getRedemption = async (req: Request, res: Response) => {
  try {
    const { redemptionId } = req.params;

    const redemption = await prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        campaign: true,
      },
    });

    if (!redemption) {
      return res.status(404).json({ error: "Redemption not found" });
    }

    res.json(redemption);
  } catch (error) {
    console.error("Get redemption error:", error);
    res.status(500).json({ error: "Failed to fetch redemption" });
  }
};

export const cancelRedemption = async (req: Request, res: Response) => {
  try {
    const { redemptionId } = req.params;

    const redemption = await prisma.redemption.findUnique({
      where: { id: redemptionId },
    });

    if (!redemption) {
      return res.status(404).json({ error: "Redemption not found" });
    }

    if (redemption.status !== "pending") {
      return res.status(400).json({ error: "Can only cancel pending redemptions" });
    }

    // Refund points
    await rewardsEngine.mintPoints(
      redemption.brandId,
      redemption.userId,
      redemption.pointsUsed.toNumber(),
      "redemption_refund",
      {
        originalRedemptionId: redemption.id,
      }
    );

    // Update status
    const updated = await prisma.redemption.update({
      where: { id: redemptionId },
      data: { status: "cancelled" },
    });

    res.json(updated);
  } catch (error) {
    console.error("Cancel redemption error:", error);
    res.status(500).json({ error: "Failed to cancel redemption" });
  }
};
