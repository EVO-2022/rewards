/**
 * TypeScript types for Rewards API responses
 * Based on actual API endpoint responses
 */

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  role?: "OWNER" | "MANAGER" | "VIEWER";
  joinedAt?: string;
}

export interface BrandSummary {
  brandId: string;
  name: string;
  slug: string;
  memberCount: number;
  totalPointsIssued: number;
  totalPointsBurned: number;
  currentLiability: number;
  totalRedemptions: number;
  completedRedemptions: number;
  pendingRedemptions: number;
  failedRedemptions: number;
  lastActivityAt: string | null;
}

export interface BrandMember {
  id: string;
  userId: string;
  email?: string;
  role: "OWNER" | "MANAGER" | "VIEWER";
  joinedAt: string;
}

export interface BrandMembersResponse {
  brandId: string;
  page: number;
  pageSize: number;
  total: number;
  members: BrandMember[];
}

export interface Redemption {
  id: string;
  brandId: string;
  userId: string;
  campaignId?: string;
  pointsUsed: number;
  status: "pending" | "completed" | "cancelled";
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email?: string;
    phone?: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
}

export interface BrandApiKey {
  id: string;
  brandId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface CreateApiKeyResponse {
  id: string;
  brandId: string;
  name: string;
  apiKey: string; // Only shown once on creation
  createdAt: string;
}

export interface RewardLedger {
  id: string;
  brandId: string;
  userId: string;
  type: "MINT" | "BURN";
  amount: number;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AdminEventLogItem {
  id: string;
  brandId: string;
  externalUserId: string | null;
  eventName: string;
  metadata: Record<string, any> | null;
  createdAt: string; // ISO string
}

export interface AdminEventListResponse {
  status: "ok";
  brandId: string;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  items: AdminEventLogItem[];
}
