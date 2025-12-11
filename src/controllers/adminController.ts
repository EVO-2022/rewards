import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";

const suspendUserSchema = z.object({
  isSuspended: z.boolean(),
});

const suspendBrandSchema = z.object({
  isSuspended: z.boolean(),
});

export const suspendUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const data = suspendUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: data.isSuspended },
    });

    res.json(user);
  } catch (error) {
    console.error("Suspend user error:", error);
    res.status(500).json({ error: "Failed to suspend user" });
  }
};

export const suspendBrand = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const data = suspendBrandSchema.parse(req.body);

    const brand = await prisma.brand.update({
      where: { id: brandId },
      data: { isSuspended: data.isSuspended },
    });

    res.json(brand);
  } catch (error) {
    console.error("Suspend brand error:", error);
    res.status(500).json({ error: "Failed to suspend brand" });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await prisma.user.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const getAllBrands = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const brands = await prisma.brand.findMany({
      take: limit,
      skip: offset,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(brands);
  } catch (error) {
    console.error("Get all brands error:", error);
    res.status(500).json({ error: "Failed to fetch brands" });
  }
};
