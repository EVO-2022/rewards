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
    // Allow smoke test bypass when env var is set
    if (!userId && process.env.SMOKE_TEST_BYPASS !== "true") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // In smoke test mode, userId should already be set by the test route
    if (!userId) {
      console.error("⚠️ No userId in smoke test mode - this should not happen");
      return res.status(500).json({ error: "Internal error: user not set" });
    }
    
    const effectiveUserId = userId;

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
            userId: effectiveUserId,
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

export const getMyBrands = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const memberships = await prisma.brandMember.findMany({
      where: { userId },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const brands = memberships.map((m) => ({
      id: m.brand.id,
      name: m.brand.name,
      slug: m.brand.slug,
      description: m.brand.description,
      isActive: m.brand.isActive,
      createdAt: m.brand.createdAt.toISOString(),
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    }));

    res.json(brands);
  } catch (error) {
    console.error("Get my brands error:", error);
    res.status(500).json({ error: "Failed to fetch brands" });
  }
};

export const getBrandSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { brandId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if brand exists and user is a member
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

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

    // Get total members count
    const totalMembers = await prisma.brandMember.count({
      where: { brandId },
    });

    // Calculate total points issued (sum of MINT entries)
    const mintEntries = await prisma.rewardLedger.findMany({
      where: {
        brandId,
        type: "MINT",
      },
      select: {
        amount: true,
      },
    });

    const totalPointsIssued = mintEntries.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0
    );

    // Calculate total points redeemed (sum of Redemption.pointsUsed where status is completed)
    const completedRedemptions = await prisma.redemption.findMany({
      where: {
        brandId,
        status: "completed",
      },
      select: {
        pointsUsed: true,
      },
    });

    const totalPointsRedeemed = completedRedemptions.reduce(
      (sum, redemption) => sum + Number(redemption.pointsUsed),
      0
    );

    // Outstanding points = issued - redeemed
    const outstandingPoints = totalPointsIssued - totalPointsRedeemed;

    res.json({
      brandId: brand.id,
      name: brand.name,
      slug: brand.slug,
      totalMembers,
      totalPointsIssued,
      totalPointsRedeemed,
      outstandingPoints,
      createdAt: brand.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Get brand summary error:", error);
    res.status(500).json({ error: "Failed to fetch brand summary" });
  }
};

export const getBrandMembers = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { brandId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if brand exists and user is a member
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

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

    // Parse pagination params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const skip = (page - 1) * pageSize;

    // Get total count
    const total = await prisma.brandMember.count({
      where: { brandId },
    });

    // Get members with user info
    const members = await prisma.brandMember.findMany({
      where: { brandId },
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
        createdAt: "asc",
      },
      skip,
      take: pageSize,
    });

    const membersList = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email || undefined,
      phone: m.user.phone || undefined,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    }));

    res.json({
      brandId,
      page,
      pageSize,
      total,
      members: membersList,
    });
  } catch (error) {
    console.error("Get brand members error:", error);
    res.status(500).json({ error: "Failed to fetch brand members" });
  }
};

