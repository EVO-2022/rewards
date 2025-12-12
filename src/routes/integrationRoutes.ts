import { Router } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { rewardsEngine } from "../services/rewardsEngine";
import { fraudDetection } from "../services/fraudDetection";
import { triggerWebhooksForEvent } from "../services/webhookService";
import { LedgerType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const router = Router();

// All integration routes require API key auth
router.use(apiKeyAuth);

// Test endpoint to verify API key authentication
router.get("/whoami", async (req, res) => {
  try {
    const auth = req.integrationAuth;
    if (!auth) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      brandId: auth.brandId,
      apiKeyId: auth.apiKeyId,
      status: "ok",
    });
  } catch (error) {
    console.error("Whoami error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Find integration user by externalUserId
 * Uses integration clerkId pattern: integration_{brandId}_{externalUserId}
 * Returns null if user doesn't exist (doesn't create)
 */
async function findIntegrationUser(
  brandId: string,
  externalUserId: string
): Promise<{ id: string } | null> {
  const integrationClerkId = `integration_${brandId}_${externalUserId}`;
  
  return await prisma.user.findUnique({
    where: { clerkId: integrationClerkId },
  });
}

/**
 * Find or create a user for integration
 * Uses integration clerkId pattern: integration_{brandId}_{externalUserId}
 */
async function findOrCreateIntegrationUser(
  brandId: string,
  externalUserId: string
): Promise<{ id: string }> {
  // Try to find existing user first
  const existing = await findIntegrationUser(brandId, externalUserId);
  if (existing) {
    return existing;
  }

  // Create new user
  const integrationClerkId = `integration_${brandId}_${externalUserId}`;
  return await prisma.user.create({
    data: {
      clerkId: integrationClerkId,
      email: null,
    },
  });
}

const issuePointsSchema = z.object({
  externalUserId: z.string().min(1, "externalUserId is required and must be non-empty"),
  points: z.number().positive("points must be a positive number"),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

router.post("/points/issue", validate(issuePointsSchema), async (req, res) => {
  try {
    const brandId = req.integrationAuth!.brandId;
    const apiKeyId = req.integrationAuth!.apiKeyId;
    const data = issuePointsSchema.parse(req.body);

    // Find or create user by externalUserId
    const user = await findOrCreateIntegrationUser(brandId, data.externalUserId);

    // Run fraud checks
    await fraudDetection.runFraudChecks(brandId, user.id, data.points);

    // Issue points using rewards engine
    const ledger = await rewardsEngine.mintPoints(
      brandId,
      user.id,
      data.points,
      data.reason || "integration_issue",
      {
        externalUserId: data.externalUserId,
        source: "api_integration",
        apiKeyId: apiKeyId,
        ...(data.metadata || {}),
      }
    );

    // Get updated balance
    const newBalance = await rewardsEngine.getUserBalance(brandId, user.id);

    // Trigger webhooks for points issued event
    await triggerWebhooksForEvent({
      brandId,
      eventName: "points.issued",
      externalUserId: data.externalUserId,
      metadata: {
        userId: user.id,
        points: data.points,
        ledgerEntryId: ledger.id,
        reason: data.reason || "integration_issue",
        apiKeyId: apiKeyId,
        integration: true,
        ...(data.metadata || {}),
      },
    });

    res.status(201).json({
      status: "ok",
      brandId,
      userId: user.id,
      externalUserId: data.externalUserId,
      pointsIssued: data.points,
      newBalance,
      ledgerEntryId: ledger.id,
    });
  } catch (error) {
    console.error("Integration issue points error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
    res.status(500).json({ error: "Failed to issue points" });
  }
});

// Balance check endpoint with query parameter
const balanceQuerySchema = z.object({
  externalUserId: z.string().min(1, "externalUserId is required and must be non-empty"),
});

router.get("/points/balance", async (req, res) => {
  try {
    const { brandId } = req.integrationAuth!;
    
    // Validate query parameters
    const queryParams = balanceQuerySchema.safeParse(req.query);
    
    if (!queryParams.success) {
      return res.status(400).json({
        error: "Validation error",
        details: queryParams.error.errors,
      });
    }

    const { externalUserId } = queryParams.data;

    // Find user by externalUserId (don't create if doesn't exist)
    const user = await findIntegrationUser(brandId, externalUserId);

    // If user doesn't exist, return balance 0 (not an error)
    if (!user) {
      return res.json({
        status: "ok",
        brandId,
        userId: null,
        externalUserId,
        balance: 0,
      });
    }

    // Get balance using existing service
    const balance = await rewardsEngine.getUserBalance(brandId, user.id);

    res.json({
      status: "ok",
      brandId,
      userId: user.id,
      externalUserId,
      balance,
    });
  } catch (error) {
    console.error("Integration get balance error:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// Redemption endpoint
const redeemPointsSchema = z.object({
  externalUserId: z.string().min(1, "externalUserId is required and must be non-empty"),
  points: z.number().int("points must be an integer").positive("points must be a positive integer"),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

router.post("/points/redeem", validate(redeemPointsSchema), async (req, res) => {
  try {
    const { brandId, apiKeyId } = req.integrationAuth!;
    const data = redeemPointsSchema.parse(req.body);

    // Find or create user by externalUserId
    const user = await findOrCreateIntegrationUser(brandId, data.externalUserId);

    // Get current balance
    const currentBalance = await rewardsEngine.getUserBalance(brandId, user.id);

    // Check if user has sufficient balance
    if (data.points > currentBalance) {
      return res.status(400).json({
        status: "error",
        code: "INSUFFICIENT_POINTS",
        message: "User does not have enough points to redeem",
        required: data.points,
        available: currentBalance,
      });
    }

    // Perform atomic transaction: create redemption + burn points
    const result = await prisma.$transaction(async (tx) => {
      // Create redemption record
      const redemption = await tx.redemption.create({
        data: {
          brandId,
          userId: user.id,
          campaignId: null,
          pointsUsed: new Decimal(data.points),
          status: "completed",
          metadata: {
            externalUserId: data.externalUserId,
            source: "api_integration",
            apiKeyId: apiKeyId,
            reason: data.reason || "integration_redeem",
            ...(data.metadata || {}),
          },
        },
      });

      // Create ledger entry (burn points)
      const ledger = await tx.rewardLedger.create({
        data: {
          brandId,
          userId: user.id,
          type: LedgerType.BURN,
          amount: new Decimal(data.points),
          reason: data.reason || "integration_redeem",
          metadata: {
            redemptionId: redemption.id,
            externalUserId: data.externalUserId,
            source: "api_integration",
            apiKeyId: apiKeyId,
            ...(data.metadata || {}),
          },
        },
      });

      return { redemption, ledger };
    });

    // Calculate new balance (currentBalance - points)
    const newBalance = currentBalance - data.points;

    // Trigger webhooks for points redeemed event
    await triggerWebhooksForEvent({
      brandId,
      eventName: "points.redeemed",
      externalUserId: data.externalUserId,
      metadata: {
        userId: user.id,
        points: data.points,
        ledgerEntryId: result.ledger.id,
        redemptionId: result.redemption.id,
        reason: data.reason || "integration_redeem",
        apiKeyId: apiKeyId,
        integration: true,
        ...(data.metadata || {}),
      },
    });

    res.status(200).json({
      status: "ok",
      brandId,
      userId: user.id,
      externalUserId: data.externalUserId,
      pointsRedeemed: data.points,
      newBalance,
      redemptionId: result.redemption.id,
      ledgerEntryId: result.ledger.id,
    });
  } catch (error) {
    console.error("Integration redeem points error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_REQUEST",
        message: "Validation error",
        details: error.errors,
      });
    }
    res.status(500).json({
      status: "error",
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    });
  }
});

// Points history endpoint
const pointsHistoryQuerySchema = z.object({
  externalUserId: z.string().min(1, "externalUserId is required and must be non-empty"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  cursor: z.string().datetime().optional(), // ISO datetime string for cursor
  type: z.nativeEnum(LedgerType).optional(),
  since: z.string().datetime().optional(),
});

router.get("/points/history", async (req, res) => {
  try {
    const { brandId } = req.integrationAuth!;

    // Validate query parameters
    const queryParams = pointsHistoryQuerySchema.safeParse(req.query);

    if (!queryParams.success) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_REQUEST",
        message: "Validation error",
        details: queryParams.error.errors,
      });
    }

    const { externalUserId, limit, cursor, type, since } = queryParams.data;

    // Find user by externalUserId (don't create if doesn't exist)
    const user = await findIntegrationUser(brandId, externalUserId);

    // If user doesn't exist, return empty array (not an error)
    if (!user) {
      return res.json({
        status: "ok",
        brandId,
        externalUserId,
        items: [],
        hasMore: false,
        nextCursor: null,
      });
    }

    // Build where clause
    const where: any = {
      brandId,
      userId: user.id,
    };

    if (type) {
      where.type = type;
    }

    // Handle createdAt filters (since and cursor)
    if (since || cursor) {
      where.createdAt = {};
      if (since) {
        where.createdAt.gte = new Date(since);
      }
      if (cursor) {
        // Cursor-based pagination: get records before the cursor timestamp (for DESC order)
        where.createdAt.lt = new Date(cursor);
      }
    }

    // Query limit + 1 to check if there are more items
    const items = await prisma.rewardLedger.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit + 1,
    });

    // Check if there are more items
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && resultItems.length > 0
        ? resultItems[resultItems.length - 1].createdAt.toISOString()
        : null;

    // Format response
    const formattedItems = resultItems.map((item) => ({
      id: item.id,
      type: item.type,
      amount: Number(item.amount),
      reason: item.reason || null,
      metadata: item.metadata || {},
      createdAt: item.createdAt.toISOString(),
    }));

    res.json({
      status: "ok",
      brandId,
      userId: user.id,
      externalUserId,
      items: formattedItems,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error("Integration points history error:", error);
    res.status(500).json({
      status: "error",
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    });
  }
});

// Redemptions history endpoint
const redemptionsHistoryQuerySchema = z.object({
  externalUserId: z.string().min(1, "externalUserId is required and must be non-empty"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  cursor: z.string().datetime().optional(), // ISO datetime string for cursor
  status: z.string().optional(),
  since: z.string().datetime().optional(),
});

router.get("/redemptions/history", async (req, res) => {
  try {
    const { brandId } = req.integrationAuth!;

    // Validate query parameters
    const queryParams = redemptionsHistoryQuerySchema.safeParse(req.query);

    if (!queryParams.success) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_REQUEST",
        message: "Validation error",
        details: queryParams.error.errors,
      });
    }

    const { externalUserId, limit, cursor, status, since } = queryParams.data;

    // Find user by externalUserId (don't create if doesn't exist)
    const user = await findIntegrationUser(brandId, externalUserId);

    // If user doesn't exist, return empty array (not an error)
    if (!user) {
      return res.json({
        status: "ok",
        brandId,
        externalUserId,
        items: [],
        hasMore: false,
        nextCursor: null,
      });
    }

    // Build where clause
    const where: any = {
      brandId,
      userId: user.id,
    };

    if (status) {
      where.status = status;
    }

    // Handle createdAt filters (since and cursor)
    if (since || cursor) {
      where.createdAt = {};
      if (since) {
        where.createdAt.gte = new Date(since);
      }
      if (cursor) {
        // Cursor-based pagination: get records before the cursor timestamp (for DESC order)
        where.createdAt.lt = new Date(cursor);
      }
    }

    // Query limit + 1 to check if there are more items
    const items = await prisma.redemption.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit + 1,
    });

    // Check if there are more items
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && resultItems.length > 0
        ? resultItems[resultItems.length - 1].createdAt.toISOString()
        : null;

    // Format response
    const formattedItems = resultItems.map((item) => ({
      id: item.id,
      points: Number(item.pointsUsed),
      reason: (item.metadata as any)?.reason || null,
      metadata: item.metadata || {},
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    }));

    res.json({
      status: "ok",
      brandId,
      userId: user.id,
      externalUserId,
      items: formattedItems,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error("Integration redemptions history error:", error);
    res.status(500).json({
      status: "error",
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    });
  }
});

// Events receiver endpoint
const eventsSchema = z.object({
  eventName: z.string().min(1, "eventName is required and must be non-empty"),
  externalUserId: z.string().min(1, "externalUserId is required and must be non-empty"),
  metadata: z.record(z.any()).optional(),
});

router.post("/events", validate(eventsSchema), async (req, res) => {
  try {
    const { brandId, apiKeyId } = req.integrationAuth!;
    const data = eventsSchema.parse(req.body);

    // Log the event
    console.log("[integration] event received", {
      brandId,
      apiKeyId,
      eventName: data.eventName,
      externalUserId: data.externalUserId,
      metadata: data.metadata,
    });

    // Store the event in the database
    const event = await prisma.integrationEvent.create({
      data: {
        brandId,
        eventName: data.eventName,
        externalUserId: data.externalUserId,
        metadata: data.metadata || undefined,
      },
    });

    // Trigger webhooks for the event (wrapped in try/catch for safety)
    try {
      await triggerWebhooksForEvent({
        brandId,
        eventName: data.eventName,
        externalUserId: data.externalUserId,
        metadata: data.metadata,
      });
    } catch (webhookError) {
      // If webhook triggering fails, log but don't fail the main request
      console.error("Integration events webhook error:", webhookError);
      // Return webhook error response
      return res.status(500).json({
        status: "error",
        code: "WEBHOOK_ERROR",
        message: "Failed to trigger webhooks for event",
      });
    }

    // Return success response
    res.status(200).json({
      status: "ok",
      brandId,
      externalUserId: data.externalUserId,
      eventName: data.eventName,
    });
  } catch (error) {
    console.error("Integration events error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_REQUEST",
        message: "Validation error",
        details: error.errors,
      });
    }
    res.status(500).json({
      status: "error",
      code: "INTERNAL_ERROR",
      message: "Failed to process event",
    });
  }
});

// Legacy endpoint (path parameter) - kept for backward compatibility
router.get("/users/:externalUserId/balance", async (req, res) => {
  try {
    const brandId = req.integrationAuth!.brandId;
    const { externalUserId } = req.params;

    // Find user by integration clerkId pattern
    const user = await findIntegrationUser(brandId, externalUserId);

    // If user doesn't exist, return balance 0
    if (!user) {
      return res.json({
        brandId,
        externalUserId,
        userId: undefined,
        balance: 0,
      });
    }

    // Get balance
    const balance = await rewardsEngine.getUserBalance(brandId, user.id);

    res.json({
      brandId,
      externalUserId,
      userId: user.id,
      balance,
    });
  } catch (error) {
    console.error("Integration get balance error:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

export default router;
