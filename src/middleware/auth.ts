import { Request, Response, NextFunction } from "express";
import { clerkClient, requireAuth } from "@clerk/express";
import { prisma } from "../utils/prisma";
import { BrandRole } from "@prisma/client";

/**
 * ✅ DEV AUTH BYPASS
 * In development, always attach a fake authenticated user.
 * In production, fall back to Clerk.
 */
export const authenticate =
  process.env.NODE_ENV === "development"
    ? async (req: any, _res: Response, next: NextFunction) => {
        req.auth = {
          userId: "dev-user-id",
          email: "dev@local.test",
          phone: undefined,
        };
        return next();
      }
    : (req: any, res: Response, next: NextFunction) => {
        // 🔒 SMOKE TEST BYPASS - Only active when explicitly enabled
        if (process.env.SMOKE_TEST_BYPASS === "true") {
          console.log("✅ SMOKE_TEST_BYPASS ACTIVE");
          return next();
        }
        // Normal Clerk authentication
        return requireAuth()(req, res, next);
      };

/**
 * ✅ DEV USER SYNC BYPASS
 */
export const syncUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    // DEV MODE: Ensure dev user exists in DB and move on
    if (process.env.NODE_ENV === "development") {
      let user = await prisma.user.findUnique({
        where: { id: "dev-user-id" },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: "dev-user-id",
            clerkId: "dev-user-id",
            email: "dev@local.test",
            isPlatformAdmin: true,
          },
        });
      }

      req.auth.userId = user.id;
      return next();
    }

    // 🔐 PRODUCTION MODE (Clerk)
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      try {
        const clerkUser = await clerkClient.users.getUser(clerkId);
        user = await prisma.user.create({
          data: {
            clerkId,
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
            phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
          },
        });
      } catch (error) {
        console.error("Error fetching Clerk user:", error);
        user = await prisma.user.create({
          data: { clerkId },
        });
      }
    }

    req.auth = {
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
    };

    next();
  } catch (error) {
    console.error("Sync user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * ✅ DEV BRAND ACCESS BYPASS
 */
export const requireBrandAccess = (requiredRole?: BrandRole) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // 🔒 SMOKE TEST BYPASS - Only active when explicitly enabled
      if (process.env.SMOKE_TEST_BYPASS === "true") {
        console.log("✅ SMOKE_TEST_ADMIN_BYPASS ACTIVE");
        return next();
      }

      if (process.env.NODE_ENV === "development") {
        req.brandId = req.params.brandId || req.body.brandId || req.query.brandId || "dev-brand-id";
        req.userRole = "OWNER";
        return next();
      }

      const userId = req.auth?.userId;
      const brandId = req.params.brandId || req.body.brandId || req.query.brandId;

      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      if (!brandId) return res.status(400).json({ error: "Brand ID is required" });

      const membership = await prisma.brandMember.findUnique({
        where: {
          userId_brandId: {
            userId,
            brandId: brandId as string,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: "Access denied to this brand" });
      }

      if (requiredRole) {
        const roleHierarchy: Record<BrandRole, number> = {
          OWNER: 3,
          MANAGER: 2,
          VIEWER: 1,
        };

        if (roleHierarchy[membership.role] < roleHierarchy[requiredRole]) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
      }

      req.brandId = brandId as string;
      req.userRole = membership.role;
      next();
    } catch (error) {
      console.error("Brand access check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * ✅ DEV PLATFORM ADMIN BYPASS
 */
export const requirePlatformAdmin = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV === "development") {
      return next();
    }

    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isPlatformAdmin) {
      return res.status(403).json({ error: "Platform admin access required" });
    }

    next();
  } catch (error) {
    console.error("Platform admin check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};