import { BrandRole, CampaignStatus, LedgerType, FraudSeverity, FraudStatus, WebhookSource } from "@prisma/client";

export type { BrandRole, CampaignStatus, LedgerType, FraudSeverity, FraudStatus, WebhookSource };

export interface WebhookIngestPayload {
  source: "shopify" | "stripe";
  event: string;
  user: {
    email?: string;
    phone?: string;
  };
  order: {
    id: string;
    total: number;
    currency: string;
  };
  metadata: {
    raw_payload: any;
  };
}

export interface AuthUser {
  userId: string;
  email?: string;
  phone?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      brandId?: string;
      userRole?: BrandRole;
    }
  }
}

