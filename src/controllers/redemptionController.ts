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
    // Support both old format (limit/offset) and new format (page/pageSize)
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 0;
    const userId = req.query.userId as string | undefined;

    const where: { brandId: string; userId?: string } = { brandId };
    if (userId) {
      where.userId = userId;
    }

    // Use page/pageSize if provided, otherwise fall back to limit/offset
    const finalLimit = pageSize > 0 ? pageSize : limit;
    const finalSkip = page > 0 ? (page - 1) * pageSize : offset;

    // Get total count and items in parallel
    const [items, total] = await Promise.all([
      prisma.redemption.findMany({
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
        take: finalLimit,
        skip: finalSkip,
      }),
      prisma.redemption.count({ where }),
    ]);

    const hasMore = finalSkip + items.length < total;

    // Convert dates to ISO strings for serialization
    const serializedItems = items.map((redemption) => ({
      id: redemption.id,
      brandId: redemption.brandId,
      userId: redemption.userId,
      campaignId: redemption.campaignId || undefined,
      pointsUsed: Number(redemption.pointsUsed),
      status: redemption.status,
      metadata: redemption.metadata || undefined,
      createdAt: redemption.createdAt.toISOString(),
      updatedAt: redemption.updatedAt.toISOString(),
      user: redemption.user
        ? {
            id: redemption.user.id,
            email: redemption.user.email || undefined,
            phone: redemption.user.phone || undefined,
          }
        : undefined,
      campaign: redemption.campaign
        ? {
            id: redemption.campaign.id,
            name: redemption.campaign.name,
          }
        : undefined,
    }));

    // Return array format for backward compatibility with dashboard
    // Dashboard expects Redemption[] but we can also support paginated format
    if (page > 0 || pageSize > 0) {
      // New paginated format
      res.json({
        status: "ok",
        brandId,
        items: serializedItems,
        page: page > 0 ? page : Math.floor(finalSkip / finalLimit) + 1,
        pageSize: finalLimit,
        total,
        hasMore,
      });
    } else {
      // Old array format for backward compatibility
      res.json(serializedItems);
    }
  } catch (error) {
    console.error("Get redemptions error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch redemptions",
    });
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
