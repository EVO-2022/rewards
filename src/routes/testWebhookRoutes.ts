import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";

type TestWebhookEvent = {
  id: string;
  receivedAt: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
};

// Use process-wide in-memory store
const globalAny = global as any;
if (!globalAny.__TEST_WEBHOOK_EVENTS__) {
  globalAny.__TEST_WEBHOOK_EVENTS__ = [] as TestWebhookEvent[];
}
const eventsStore = globalAny.__TEST_WEBHOOK_EVENTS__ as TestWebhookEvent[];

const router = Router();

// POST /api/__test/webhook-receiver
router.post("/api/__test/webhook-receiver", (req: Request, res: Response) => {
  // Guard: only allow when SMOKE_TEST_BYPASS is enabled
  if (process.env.SMOKE_TEST_BYPASS !== "true") {
    return res.status(403).json({ error: "Test webhooks disabled" });
  }

  try {
    const id = randomUUID ? randomUUID() : Date.now().toString();
    const receivedAt = new Date().toISOString();

    const event: TestWebhookEvent = {
      id,
      receivedAt,
      headers: req.headers as Record<string, string | string[] | undefined>,
      body: req.body,
    };

    // Push event and cap at 50 entries
    eventsStore.push(event);
    if (eventsStore.length > 50) {
      eventsStore.shift();
    }

    console.log("[TEST WEBHOOK RECEIVER] Event received", { id, receivedAt });

    res.status(200).json({ status: "ok", id, receivedAt });
  } catch (error) {
    console.error("[TEST WEBHOOK RECEIVER] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/__test/webhook-receiver/events
router.get("/api/__test/webhook-receiver/events", (_req: Request, res: Response) => {
  // Guard: only allow when SMOKE_TEST_BYPASS is enabled
  if (process.env.SMOKE_TEST_BYPASS !== "true") {
    return res.status(403).json({ error: "Test webhooks disabled" });
  }

  res.json({
    status: "ok",
    count: eventsStore.length,
    items: [...eventsStore].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1)),
  });
});

export default router;
