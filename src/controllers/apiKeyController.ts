import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { BrandRole } from "@prisma/client";
import { createBrandApiKeyForBrandId } from "../services/apiKeyService";
import { z } from "zod";

const createApiKeySchema = z.object({
  name: z.string().min(1),
});

export const createApiKey = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { brandId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = createApiKeySchema.parse(req.body);

    // Verify brand exists and user is OWNER
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

    if (membership.role !== BrandRole.OWNER) {
      return res.status(403).json({ error: "Only brand owners can create API keys" });
    }

    // Use shared service to create API key
    const { brandApiKey, apiKey: rawKey } = await createBrandApiKeyForBrandId(
      brandId,
      data.name
    );

    // Return with raw key (only time it's shown)
    res.status(201).json({
      id: brandApiKey.id,
      brandId: brandApiKey.brandId,
      name: brandApiKey.name,
      apiKey: rawKey, // Only shown once!
      createdAt: brandApiKey.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Create API key error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    if (error instanceof Error && error.message === "Brand not found") {
      return res.status(404).json({ error: "Brand not found" });
    }
    res.status(500).json({ error: "Failed to create API key" });
  }
};

export const listApiKeys = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { brandId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify brand exists and user is a member
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

    // Get all API keys for this brand
    const apiKeys = await prisma.brandApiKey.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    });

    const result = apiKeys.map((key: any) => ({
      id: key.id,
      brandId: key.brandId,
      name: key.name,
      isActive: key.isActive,
      createdAt: key.createdAt.toISOString(),
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
    }));

    res.json(result);
  } catch (error) {
    console.error("List API keys error:", error);
    res.status(500).json({ error: "Failed to fetch API keys" });
  }
};

export const disableApiKey = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { brandId, keyId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify brand exists and user is a member
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

    // Verify the API key belongs to this brand
    const apiKey = await prisma.brandApiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }

    if (apiKey.brandId !== brandId) {
      return res.status(403).json({ error: "API key does not belong to this brand" });
    }

    // Disable the key
    const updated = await prisma.brandApiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    res.json({
      id: updated.id,
      brandId: updated.brandId,
      name: updated.name,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      lastUsedAt: updated.lastUsedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Disable API key error:", error);
    res.status(500).json({ error: "Failed to disable API key" });
  }
};

