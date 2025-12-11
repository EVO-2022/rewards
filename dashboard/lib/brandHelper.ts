import { adminApiFetch } from "./rewardsApi";
import { Brand } from "./types";

/**
 * Get the first brand for the current user
 * Used as the "active" brand for MVP
 * Falls back to NEXT_PUBLIC_BRAND_ID if set
 */
export async function getFirstBrand(): Promise<Brand | null> {
  const fallbackId = process.env.NEXT_PUBLIC_BRAND_ID;
  
  if (fallbackId) {
    return { id: fallbackId } as Brand;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("NEXT_PUBLIC_BRAND_ID is not set. Falling back to /brands/mine API call.");
  }

  try {
    const brands = await adminApiFetch<Brand[]>("/brands/mine");
    return brands.length > 0 ? brands[0] : null;
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return null;
  }
}
