import type { Request } from "express";

export type WebhookEventPayload = {
  brandId: string;
  eventName: string;
  externalUserId: string;
  metadata?: Record<string, unknown>;
};

export type WebhookSubscription = {
  id: string;
  brandId: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSuccess: Date | null;
  lastError: Date | null;
  lastErrorMessage: string | null;
};

/**
 * Minimal event trigger used by the integration events route.
 * For now this just logs; no DB, no network calls.
 */
export async function triggerWebhooksForEvent(payload: WebhookEventPayload): Promise<void> {
  console.log("[webhooks] triggerWebhooksForEvent (stub)", payload);
}

/**
 * Stubbed webhook service used by webhookController.
 * This keeps the API shape in place without requiring any Prisma models.
 */
export const webhookService = {
  async listSubscriptions(brandId: string): Promise<WebhookSubscription[]> {
    console.log("[webhooks] listSubscriptions (stub)", { brandId });
    // No persistence yet; return empty list
    return [];
  },

  async createSubscription(
    brandId: string,
    input: { url: string; eventTypes: string[]; request?: Request }
  ): Promise<WebhookSubscription> {
    console.log("[webhooks] createSubscription (stub)", {
      brandId,
      url: input.url,
      eventTypes: input.eventTypes,
    });

    const now = new Date();

    // Fake, in-memory style object just to satisfy types
    return {
      id: `stub-${now.getTime()}`,
      brandId,
      url: input.url,
      eventTypes: input.eventTypes,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastSuccess: null,
      lastError: null,
      lastErrorMessage: null,
    };
  },

  async deleteSubscription(brandId: string, webhookId: string): Promise<void> {
    console.log("[webhooks] deleteSubscription (stub)", {
      brandId,
      webhookId,
    });
    // No-op for now
  },
};
