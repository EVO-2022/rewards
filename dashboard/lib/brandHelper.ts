import { adminApiFetch } from "./server/rewardsApi";
import { Brand } from "./types";
import { debugLog, debugWarn } from "./server/debug";

/**
 * Sanitize a brand object to ensure it's fully serializable
 */
function sanitizeBrand(brand: any): Brand {
  return {
    id: String(brand.id || ""),
    name: String(brand.name || ""),
    slug: String(brand.slug || ""),
    description: brand.description ? String(brand.description) : undefined,
    isActive: Boolean(brand.isActive),
    createdAt: brand.createdAt ? String(brand.createdAt) : new Date().toISOString(),
    role: brand.role ? (brand.role as "OWNER" | "MANAGER" | "VIEWER") : undefined,
    joinedAt: brand.joinedAt ? String(brand.joinedAt) : undefined,
  };
}

/**
 * Get the first brand for the user from a user-scoped endpoint
 */
export async function getFirstBrand(): Promise<Brand | null> {
  const brands = await adminApiFetch<Brand[]>("/me/brands", { method: "GET" });
  console.log("[brands] me/brands", brands);
  return Array.isArray(brands) ? (brands[0] ? sanitizeBrand(brands[0]) : null) : null;
}
