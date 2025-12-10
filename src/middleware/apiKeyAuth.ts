import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { hashApiKey } from "../utils/apiKeys";

export interface BrandIntegrationContext {
  brandId: string;
  apiKeyId: string;
}

declare global {
  namespace Express {
    interface Request {
      brandIntegration?: BrandIntegrationContext;
    }
  }
}

/**
 * API Key authentication middleware
 * Validates X-API-Key header and attaches brand context to request
 */
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(401).json({ error: "API key required" });
    }

    // Hash the provided key
    const keyHash = hashApiKey(apiKey);

    // Look up the API key
    const brandApiKey = await prisma.brandApiKey.findUnique({
      where: { keyHash },
      include: {
        brand: {
          select: {
            id: true,
            isActive: true,
            isSuspended: true,
          },
        },
      },
    });

    // Check if key exists and is active
    if (!brandApiKey || !brandApiKey.isActive) {
      console.log("❌ Invalid API key attempt");
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Check if brand is active and not suspended
    if (!brandApiKey.brand.isActive || brandApiKey.brand.isSuspended) {
      return res.status(403).json({ error: "Brand is inactive or suspended" });
    }

    // Update lastUsedAt (non-blocking)
    prisma.brandApiKey
      .update({
        where: { id: brandApiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err: any) => {
        console.error("Failed to update API key lastUsedAt:", err);
      });

    // Attach brand context to request
    req.brandIntegration = {
      brandId: brandApiKey.brandId,
      apiKeyId: brandApiKey.id,
    };

    console.log("✅ API key authenticated:", {
      brandId: brandApiKey.brandId,
      apiKeyId: brandApiKey.id,
    });

    next();
  } catch (error) {
    console.error("API key auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

