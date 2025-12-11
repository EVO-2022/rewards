import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { BrandRole } from "@prisma/client";
import { z } from "zod";
import { webhookService } from "../services/webhookService";

const createWebhookSchema = z.object({
  url: z
    .string()
    .url("URL must be a valid URL")
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://"),
      "URL must start with http:// or https://"
    ),
  eventTypes: z.array(z.string()).optional(),
  secret: z.string().optional(),
});

export const listWebhooks = async (req: Request, res: Response) => {
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

    // Get all webhook subscriptions for this brand using stub service
    const webhooks = await webhookService.listSubscriptions(brandId);

    // Return webhooks without exposing secret
    const result = webhooks.map((webhook) => ({
      id: webhook.id,
      brandId: webhook.brandId,
      url: webhook.url,
      eventTypes: webhook.eventTypes,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
      lastSuccess: webhook.lastSuccess?.toISOString() || null,
      lastError: webhook.lastError?.toISOString() || null,
      lastErrorMessage: webhook.lastErrorMessage || null,
    }));

    res.json({ items: result });
  } catch (error) {
    console.error("List webhooks error:", error);
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
};

export const createWebhook = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { brandId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = createWebhookSchema.parse(req.body);

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

    // Default event types if not provided
    const eventTypes =
      data.eventTypes && data.eventTypes.length > 0
        ? data.eventTypes
        : ["points.issued", "points.redeemed"];

    // Create webhook subscription using stub service
    const webhook = await webhookService.createSubscription(brandId, {
      url: data.url,
      eventTypes,
      request: req,
    });

    // Return webhook without exposing secret
    res.status(201).json({
      id: webhook.id,
      brandId: webhook.brandId,
      url: webhook.url,
      eventTypes: webhook.eventTypes,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
      lastSuccess: webhook.lastSuccess?.toISOString() || null,
      lastError: webhook.lastError?.toISOString() || null,
      lastErrorMessage: webhook.lastErrorMessage || null,
    });
  } catch (error) {
    console.error("Create webhook error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create webhook" });
  }
};

export const deleteWebhook = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { brandId, webhookId } = req.params;

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

    // Delete webhook subscription using stub service
    // The stub service handles validation internally
    await webhookService.deleteSubscription(brandId, webhookId);

    res.status(204).send();
  } catch (error) {
    console.error("Delete webhook error:", error);
    res.status(500).json({ error: "Failed to delete webhook" });
  }
};
