import { adminApiFetch } from "./rewardsApi";
import { Brand } from "./types";

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
    return brands.length > 0 ? brands[0] : null;
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return null;
  }
}
