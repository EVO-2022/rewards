import { prisma } from "../utils/prisma";
import { WebhookSource } from "@prisma/client";
import { WebhookIngestPayload } from "../types";
import { rewardsEngine } from "./rewardsEngine";
import { fraudDetection } from "./fraudDetection";
import { clerkClient } from "@clerk/express";

export class WebhookService {
  /**
   * Process incoming webhook
   */
  async processWebhook(payload: WebhookIngestPayload, brandId?: string) {
    // Store raw webhook event
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        brandId: brandId || null,
        source: payload.source.toUpperCase() as WebhookSource,
        eventType: payload.event,
        rawPayload: payload.metadata.raw_payload,
        processed: false,
      },
    });

    try {
      // Find or create user
      const user = await this.findOrCreateUser(payload.user);

      // Determine brand if not provided
      const finalBrandId = brandId || (await this.determineBrand(payload));

      if (!finalBrandId) {
        throw new Error("Unable to determine brand for webhook");
      }

      // Process based on event type
      if (payload.event === "checkout.completed" || payload.event === "payment_intent.succeeded") {
        await this.processSaleEvent(finalBrandId, user.id, payload);
      }

      // Mark as processed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      return webhookEvent;
    } catch (error) {
      // Mark as error
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  }

  /**
   * Find or create user from webhook data
   */
  private async findOrCreateUser(userData: { email?: string; phone?: string }) {
    // Try to find existing user
    let user = null;

    if (userData.email) {
      user = await prisma.user.findUnique({
        where: { email: userData.email },
      });
    }

    if (!user && userData.phone) {
      user = await prisma.user.findUnique({
        where: { phone: userData.phone },
      });
    }

    // If user doesn't exist, we need to create a placeholder
    // In production, you'd want to create a Clerk user first
    if (!user) {
      // For MVP, create user with a generated clerkId
      // In production, integrate with Clerk user creation
      const tempClerkId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      user = await prisma.user.create({
        data: {
          clerkId: tempClerkId,
          email: userData.email || null,
          phone: userData.phone || null,
        },
      });
    }

    return user;
  }

  /**
   * Determine brand from webhook payload
   * In production, this would use webhook signatures or metadata
   */
  private async determineBrand(_payload: WebhookIngestPayload): Promise<string | null> {
    // For MVP, return first active brand
    // In production, use webhook metadata or signatures to determine brand
    const brand = await prisma.brand.findFirst({
      where: { isActive: true, isSuspended: false },
    });

    return brand?.id || null;
  }

  /**
   * Process sale event and issue points
   */
  private async processSaleEvent(brandId: string, userId: string, payload: WebhookIngestPayload) {
    // Calculate points (1 point per dollar by default)
    const points = Math.floor(payload.order.total);

    // Run fraud checks
    await fraudDetection.runFraudChecks(brandId, userId, points);

    // Mint points
    await rewardsEngine.mintPoints(
      brandId,
      userId,
      points,
      payload.event,
      {
        orderId: payload.order.id,
        orderTotal: payload.order.total,
        currency: payload.order.currency,
        source: payload.source,
      }
    );
  }
}

export const webhookService = new WebhookService();

