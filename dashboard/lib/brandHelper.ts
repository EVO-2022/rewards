import { adminApiFetch } from "./rewardsApi";
import { Brand } from "./types";

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
 * Get the first brand for the current user
 * Used as the "active" brand for MVP
 */
export async function getFirstBrand(): Promise<Brand | null> {
  try {
    // API returns either { brands: Brand[] } or Brand[] directly
    // Handle both formats for flexibility
    const response = await adminApiFetch<{ brands?: Brand[] } | Brand[]>("/brands/mine");

    // Check if response is wrapped in { brands: ... }
    const brands = Array.isArray(response) ? response : response.brands || [];

    if (brands.length === 0) {
      return null;
    }

    // Sanitize the brand to ensure it's fully serializable
    const firstBrand = brands[0];
    return sanitizeBrand(firstBrand);
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return null;
  }
}
