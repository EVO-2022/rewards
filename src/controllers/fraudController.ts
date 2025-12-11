import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { fraudDetection } from "../services/fraudDetection";
import { FraudStatus } from "@prisma/client";
import { z } from "zod";

const reviewFraudFlagSchema = z.object({
  status: z.nativeEnum(FraudStatus),
});

export const getFraudFlags = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.query;
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (brandId) where.brandId = brandId;
    if (status) where.status = status;

    const flags = await prisma.fraudFlag.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    res.json(flags);
  } catch (error) {
    console.error("Get fraud flags error:", error);
    res.status(500).json({ error: "Failed to fetch fraud flags" });
  }
};

export const getFraudFlag = async (req: Request, res: Response) => {
  try {
    const { flagId } = req.params;

    const flag = await prisma.fraudFlag.findUnique({
      where: { id: flagId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!flag) {
      return res.status(404).json({ error: "Fraud flag not found" });
    }

    res.json(flag);
  } catch (error) {
    console.error("Get fraud flag error:", error);
    res.status(500).json({ error: "Failed to fetch fraud flag" });
  }
};

export const reviewFraudFlag = async (req: Request, res: Response) => {
  try {
    const { flagId } = req.params;
    const reviewerId = req.auth?.userId; // This is now the database user ID from syncUser
    const data = reviewFraudFlagSchema.parse(req.body);

    if (!reviewerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const flag = await fraudDetection.reviewFraudFlag(flagId, reviewerId, data.status);

    res.json(flag);
  } catch (error) {
    console.error("Review fraud flag error:", error);
    res.status(500).json({ error: "Failed to review fraud flag" });
  }
};
