import { Request, Response } from "express";
import { webhookService } from "../services/webhookService";
import { WebhookIngestPayload } from "../types";
import { z } from "zod";

const webhookIngestSchema = z.object({
  source: z.enum(["shopify", "stripe"]),
  event: z.string(),
  user: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  order: z.object({
    id: z.string(),
    total: z.number(),
    currency: z.string(),
  }),
  metadata: z.object({
    raw_payload: z.any(),
  }),
});

export const ingestWebhook = async (req: Request, res: Response) => {
  try {
    const payload = webhookIngestSchema.parse(req.body) as WebhookIngestPayload;
    const brandId = req.query.brandId as string | undefined;

    const webhookEvent = await webhookService.processWebhook(payload, brandId);

    res.status(201).json({
      success: true,
      webhookEventId: webhookEvent.id,
    });
  } catch (error) {
    console.error("Webhook ingestion error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid webhook payload",
        details: error.errors,
      });
    }
    res.status(500).json({ error: "Failed to process webhook" });
  }
};

