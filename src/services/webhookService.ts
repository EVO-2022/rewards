import { prisma } from "../utils/prisma";

export type WebhookEventType = "points.issued" | "points.redeemed";

export interface WebhookEventPayload {
  type: WebhookEventType;
  brandId: string;
  userId: string;
  externalUserId?: string | null;
  points: number;
  ledgerEntryId?: string;
  redemptionId?: string;
  createdAt: string; // ISO timestamp
  metadata?: Record<string, any>;
}

/**
 * Trigger webhooks for points events (points.issued, points.redeemed)
 * Finds all active subscriptions matching the event type and sends POST requests
 * Errors are logged but don't fail the main request
 */
async function triggerWebhooksForPointsEvent(event: WebhookEventPayload): Promise<void> {
  try {
    // 1) Look up active subscriptions for the brand
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: {
        brandId: event.brandId,
        isActive: true,
        OR: [{ eventTypes: { has: event.type } }, { eventTypes: { has: "*" } }],
      },
    });

    // 2) If none, return early
    if (subscriptions.length === 0) {
      return;
    }

    console.log(
      `[Webhook] Triggering ${subscriptions.length} webhook(s) for event ${event.type} (brand: ${event.brandId})`
    );

    // 3) For each subscription, send POST request
    const promises = subscriptions.map(async (subscription) => {
      try {
        const payload = {
          event: event.type,
          data: event,
        };

        const response = await fetch(subscription.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Rewards-Brand-Id": event.brandId,
            "X-Rewards-Event-Type": event.type,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          // Success: update lastSuccess and clear error fields
          await prisma.webhookSubscription.update({
            where: { id: subscription.id },
            data: {
              lastSuccess: new Date(),
              lastError: null,
              lastErrorMessage: null,
            },
          });
          console.log(
            `[Webhook] Successfully sent webhook ${subscription.id} to ${subscription.url}`
          );
        } else {
          // HTTP error: update error fields
          const errorText = await response.text().catch(() => `HTTP ${response.status}`);
          const truncatedError =
            errorText.length > 500 ? errorText.substring(0, 500) + "..." : errorText;

          await prisma.webhookSubscription.update({
            where: { id: subscription.id },
            data: {
              lastError: new Date(),
              lastErrorMessage: truncatedError,
            },
          });
          console.error(
            `[Webhook] Failed to send webhook ${subscription.id} to ${subscription.url}: HTTP ${response.status}`
          );
        }
      } catch (error) {
        // Network/other error: update error fields
        const errorMessage =
          error instanceof Error ? error.message : String(error || "Unknown error");
        const truncatedError =
          errorMessage.length > 500 ? errorMessage.substring(0, 500) + "..." : errorMessage;

        await prisma.webhookSubscription.update({
          where: { id: subscription.id },
          data: {
            lastError: new Date(),
            lastErrorMessage: truncatedError,
          },
        });
        console.error(
          `[Webhook] Error sending webhook ${subscription.id} to ${subscription.url}:`,
          errorMessage
        );
      }
    });

    // Wait for all webhooks to complete (but don't throw if any fail)
    await Promise.allSettled(promises);
  } catch (error) {
    // Log but don't throw - webhook failures shouldn't break the main request
    console.error("[Webhook] Error in triggerWebhooksForEvent:", error);
  }
}

/**
 * Trigger webhooks for custom integration events
 * This function handles arbitrary event names (not just points.issued/points.redeemed)
 * Logs the event and attempts to trigger webhooks if subscriptions exist
 */
async function triggerWebhooksForCustomEvent(params: {
  brandId: string;
  eventName: string;
  externalUserId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    // Log the event
    console.log("[webhooks] triggerWebhooksForEvent", {
      brandId: params.brandId,
      eventName: params.eventName,
      externalUserId: params.externalUserId,
      metadata: params.metadata ?? null,
    });

    // Try to find webhook subscriptions that might match this event
    // Check for subscriptions with "*" (all events) or the specific eventName
    try {
      const subscriptions = await prisma.webhookSubscription.findMany({
        where: {
          brandId: params.brandId,
          isActive: true,
          OR: [{ eventTypes: { has: params.eventName } }, { eventTypes: { has: "*" } }],
        },
      });

      if (subscriptions.length > 0) {
        console.log(
          `[Webhook] Found ${subscriptions.length} webhook subscription(s) for custom event ${params.eventName} (brand: ${params.brandId})`
        );

        // For each subscription, send POST request with custom event payload
        const promises = subscriptions.map(async (subscription) => {
          try {
            const payload = {
              event: params.eventName,
              data: {
                brandId: params.brandId,
                externalUserId: params.externalUserId,
                eventName: params.eventName,
                metadata: params.metadata ?? null,
                createdAt: new Date().toISOString(),
              },
            };

            const response = await fetch(subscription.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Rewards-Brand-Id": params.brandId,
                "X-Rewards-Event-Type": params.eventName,
              },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              await prisma.webhookSubscription.update({
                where: { id: subscription.id },
                data: {
                  lastSuccess: new Date(),
                  lastError: null,
                  lastErrorMessage: null,
                },
              });
              console.log(
                `[Webhook] Successfully sent custom event webhook ${subscription.id} to ${subscription.url}`
              );
            } else {
              const errorText = await response.text().catch(() => `HTTP ${response.status}`);
              const truncatedError =
                errorText.length > 500 ? errorText.substring(0, 500) + "..." : errorText;

              await prisma.webhookSubscription.update({
                where: { id: subscription.id },
                data: {
                  lastError: new Date(),
                  lastErrorMessage: truncatedError,
                },
              });
              console.error(
                `[Webhook] Failed to send custom event webhook ${subscription.id} to ${subscription.url}: HTTP ${response.status}`
              );
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error || "Unknown error");
            const truncatedError =
              errorMessage.length > 500 ? errorMessage.substring(0, 500) + "..." : errorMessage;

            await prisma.webhookSubscription.update({
              where: { id: subscription.id },
              data: {
                lastError: new Date(),
                lastErrorMessage: truncatedError,
              },
            });
            console.error(
              `[Webhook] Error sending custom event webhook ${subscription.id} to ${subscription.url}:`,
              errorMessage
            );
          }
        });

        await Promise.allSettled(promises);
      }
    } catch (webhookError) {
      // If webhook lookup fails (e.g., Prisma client not regenerated), just log and continue
      console.warn(
        "[Webhook] Could not trigger webhooks for custom event (webhook system may not be initialized):",
        webhookError
      );
    }
  } catch (error) {
    // Log but never throw - this function should never break the main request
    console.error("[Webhook] Error in triggerWebhooksForCustomEvent:", error);
  }
}

/**
 * Trigger webhooks for events
 * Function overload for points events (points.issued, points.redeemed)
 */
export async function triggerWebhooksForEvent(event: WebhookEventPayload): Promise<void>;

/**
 * Trigger webhooks for events
 * Function overload for custom integration events
 */
export async function triggerWebhooksForEvent(params: {
  brandId: string;
  eventName: string;
  externalUserId: string;
  metadata?: Record<string, unknown>;
}): Promise<void>;

/**
 * Implementation that handles both points events and custom events
 */
export async function triggerWebhooksForEvent(
  eventOrParams:
    | WebhookEventPayload
    | {
        brandId: string;
        eventName: string;
        externalUserId: string;
        metadata?: Record<string, unknown>;
      }
): Promise<void> {
  // Check if it's a points event (has 'type' and 'userId' properties)
  if ("type" in eventOrParams && "userId" in eventOrParams) {
    return triggerWebhooksForPointsEvent(eventOrParams as WebhookEventPayload);
  } else {
    return triggerWebhooksForCustomEvent(
      eventOrParams as {
        brandId: string;
        eventName: string;
        externalUserId: string;
        metadata?: Record<string, unknown>;
      }
    );
  }
}
