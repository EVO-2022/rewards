import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { BrandRole } from "@prisma/client";
import { z } from "zod";

const createBrandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createBrand = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId; // This is now the database user ID from syncUser
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = createBrandSchema.parse(req.body);

    // Check if slug exists
    const existing = await prisma.brand.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return res.status(400).json({ error: "Brand slug already exists" });
    }

    // Create brand and add user as owner
    const brand = await prisma.brand.create({
      data: {
        ...data,
        members: {
          create: {
            userId: userId,
            role: BrandRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(brand);
  } catch (error) {
    console.error("Create brand error:", error);
    res.status(500).json({ error: "Failed to create brand" });
  }
};

export const getBrands = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId; // This is now the database user ID from syncUser
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const memberships = await prisma.brandMember.findMany({
      where: { userId },
      include: {
        brand: true,
      },
    });

    const brands = memberships.map((m) => ({
      ...m.brand,
      role: m.role,
    }));

    res.json(brands);
  } catch (error) {
    console.error("Get brands error:", error);
    res.status(500).json({ error: "Failed to fetch brands" });
  }
};

export const getBrand = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        campaigns: true,
      },
    });

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    res.json(brand);
  } catch (error) {
    console.error("Get brand error:", error);
    res.status(500).json({ error: "Failed to fetch brand" });
  }
};

export const updateBrand = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const data = updateBrandSchema.parse(req.body);

    const brand = await prisma.brand.update({
      where: { id: brandId },
      data,
    });

    res.json(brand);
  } catch (error) {
    console.error("Update brand error:", error);
    res.status(500).json({ error: "Failed to update brand" });
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;

    await prisma.brand.delete({
      where: { id: brandId },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Delete brand error:", error);
    res.status(500).json({ error: "Failed to delete brand" });
  }
};

