import { adminApiFetch } from "./rewardsApi";
import { Brand } from "./types";

/**
 * Get the first brand for the current user
 * Used as the "active" brand for MVP
 */
export async function getFirstBrand(): Promise<Brand | null> {
  try {
    const brands = await adminApiFetch<Brand[]>("/brands/mine");
    return brands.length > 0 ? brands[0] : null;
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return null;
  }
}
