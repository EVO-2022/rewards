import { Request, Response, NextFunction } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { prisma } from "../utils/prisma";
import { BrandRole } from "@prisma/client";

// Create Clerk client instance
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Authentication middleware
 *
 * Verifies Clerk JWT, syncs/loads the DB user, and attaches it to req.user.
 * Also maintains req.auth for backward compatibility.
 *
 * Development mode: Bypasses auth for local development
 * Production mode: Uses Clerk authentication
 *
 * IMPORTANT: SMOKE_TEST_BYPASS only works for routes starting with /api/__test
 */
export const authenticate = async (req: any, res: Response, next: NextFunction) => {
  // Development mode: bypass auth and ensure dev user exists
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

    // Attach user to request
    req.user = user;
    req.auth = {
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
    };
    return next();
  }

  // Production mode: use Clerk
  // Check if Clerk secret key is configured
  if (!process.env.CLERK_SECRET_KEY) {
    console.error("❌ CLERK_SECRET_KEY is not set in environment variables");
    return res.status(500).json({
      error: "Authentication not configured",
      details: "CLERK_SECRET_KEY environment variable is missing",
    });
  }

  // Log auth attempt for debugging
  const authHeader = req.headers.authorization;
  console.log("🔐 Auth attempt:", {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!authHeader,
    authHeaderType: authHeader ? (authHeader.startsWith("Bearer ") ? "Bearer" : "Other") : "None",
  });

  // Extract token from Authorization header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("❌ Missing or invalid Authorization header");
    return res.status(401).json({
      error: "Unauthorized",
      details: "Missing or invalid authentication token",
      hint: "Ensure you're sending a valid Clerk session token in the Authorization header as: Authorization: Bearer <token>",
    });
  }

  const token = authHeader.substring(7);

  // Verify token using @clerk/backend
  try {
    const verification = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const clerkId = verification.sub || verification.userId;
    const sessionId = verification.sid || verification.sessionId;

    if (!clerkId || typeof clerkId !== "string") {
      console.error("❌ Token verification failed: no userId");
      return res.status(401).json({
        error: "Unauthorized",
        details: "Invalid authentication token",
        hint: "Ensure you're sending a valid Clerk session token in the Authorization header as: Authorization: Bearer <token>",
      });
    }

    // Success - log the authenticated user
    console.log("✅ Authenticated user:", clerkId);

    // Sync/load DB user
    console.log("🔄 Syncing user to database:", { clerkId });

    // Look up user by Clerk ID
    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    // If user doesn't exist, create them from Clerk data
    if (!user) {
      console.log("📝 Creating new user from Clerk:", clerkId);
      try {
        const clerkUser = await clerkClient.users.getUser(clerkId);
        user = await prisma.user.create({
          data: {
            clerkId,
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
            phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
          },
        });
        console.log("✅ Created user in database:", user.id);
      } catch (error) {
        console.error("❌ Error fetching Clerk user:", error);
        // Fallback: create user with just Clerk ID
        user = await prisma.user.create({
          data: { clerkId },
        });
        console.log("✅ Created user with fallback:", user.id);
      }
    } else {
      console.log("✅ User already exists in database:", user.id);
    }

    // Attach user to request
    req.user = user;
    req.auth = {
      userId: user.id, // Database user ID
      email: user.email || undefined,
      phone: user.phone || undefined,
      clerkId: clerkId, // Keep Clerk ID for reference
      sessionId: sessionId || undefined,
    };

    next();
  } catch (error) {
    console.error("❌ Clerk authentication error:", {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method,
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 30) + "..." : "None",
    });
    return res.status(401).json({
      error: "Unauthorized",
      details: "Invalid or missing authentication token",
      hint: "Ensure you're sending a valid Clerk session token in the Authorization header as: Authorization: Bearer <token>",
    });
  }
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
    // req.auth.userId from Clerk is the Clerk user ID (e.g., "user_xxx")
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      console.error("❌ syncUser: No Clerk ID in req.auth", {
        hasAuth: !!req.auth,
        authKeys: req.auth ? Object.keys(req.auth) : [],
      });
      return res.status(401).json({ error: "Unauthorized - no user ID" });
    }

    console.log("🔄 Syncing user to database:", { clerkId });

    // Look up user by Clerk ID
    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    // If user doesn't exist, create them from Clerk data
    if (!user) {
      console.log("📝 Creating new user from Clerk:", clerkId);
      try {
        const clerkUser = await clerkClient.users.getUser(clerkId);
        user = await prisma.user.create({
          data: {
            clerkId,
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
            phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
          },
        });
        console.log("✅ Created user in database:", user.id);
      } catch (error) {
        console.error("❌ Error fetching Clerk user:", error);
        // Fallback: create user with just Clerk ID
        user = await prisma.user.create({
          data: { clerkId },
        });
        console.log("✅ Created user with fallback:", user.id);
      }
    } else {
      console.log("✅ User already exists in database:", user.id);
    }

    // Replace Clerk ID with database user ID for use in controllers
    req.auth = {
      userId: user.id, // Database user ID
      email: user.email || undefined,
      phone: user.phone || undefined,
      clerkId: clerkId, // Keep Clerk ID for reference
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
      // Development mode: bypass brand access checks
      if (process.env.NODE_ENV === "development") {
        req.brandId = req.params.brandId || req.body.brandId || req.query.brandId || "dev-brand-id";
        req.userRole = "OWNER";
        return next();
      }

      // Production mode: enforce brand access

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
 * Admin authentication middleware
 *
 * Calls authenticate first to verify JWT and sync/load DB user.
 * For MVP, does not enforce platform admin checks - just ensures req.user exists.
 * TODO: Later tighten this to real role checks, but MVP should not block
 * normal users from managing their own brands.
 */
export const adminAuth = async (req: any, res: Response, next: NextFunction) => {
  // First, run authenticate to verify JWT and sync user
  return authenticate(req, res, () => {
    // Ensure req.user exists (authenticate should have set it)
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized - user not found" });
    }

    // For MVP, just ensure user exists - no additional role checks
    // TODO: Add platform admin or brand owner checks here later
    next();
  });
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
