import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { hashApiKey } from "../utils/apiKeys";

export interface IntegrationAuthContext {
  brandId: string;
  apiKeyId: string;
}

declare global {
  namespace Express {
    interface Request {
      integrationAuth?: IntegrationAuthContext;
    }
  }
}

/**
 * API Key authentication middleware
 * Validates API key from either Authorization: Bearer rk_... or x-api-key header
 * Attaches brand context to request via req.integrationAuth
 */
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to get API key from Authorization header first (Bearer rk_...)
    let apiKey: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token.startsWith("rk_")) {
        apiKey = token;
      }
    }

    // If not found, try x-api-key header (case-insensitive)
    if (!apiKey) {
      const xApiKey = req.headers["x-api-key"] as string;
      if (xApiKey && xApiKey.startsWith("rk_")) {
        apiKey = xApiKey;
      }
    }

    if (!apiKey) {
      return res.status(401).json({ error: "Missing API key" });
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
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Check if brand is active and not suspended
    if (!brandApiKey.brand.isActive || brandApiKey.brand.isSuspended) {
      return res.status(403).json({ error: "Brand is inactive or suspended" });
    }

    // Update lastUsedAt (non-blocking, ignore errors)
    prisma.brandApiKey
      .update({
        where: { id: brandApiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Silently ignore errors updating lastUsedAt
      });

    // Attach integration auth context to request
    req.integrationAuth = {
      brandId: brandApiKey.brandId,
      apiKeyId: brandApiKey.id,
    };

    next();
  } catch (error) {
    console.error("API key auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
