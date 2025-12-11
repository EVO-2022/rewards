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
 * Get the current brand for the user
 * - First checks NEXT_PUBLIC_BRAND_ID env var if set
 * - Otherwise falls back to fetching the first brand from /brands/mine
 * Used as the "active" brand for MVP
 */
export async function getFirstBrand(): Promise<Brand | null> {
  // Check for NEXT_PUBLIC_BRAND_ID fallback first
  const fallbackId = process.env.NEXT_PUBLIC_BRAND_ID;
  if (fallbackId) {
    try {
      // Try to fetch the brand details using the fallback ID
      const brand = await adminApiFetch<Brand>(`/brands/${fallbackId}`);
      return sanitizeBrand(brand);
    } catch (error) {
      // If fallback ID fails, continue to normal flow
      const errorMsg =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : String(error || "Unknown error");
      console.warn("Failed to fetch brand with NEXT_PUBLIC_BRAND_ID:", errorMsg);
      // Continue to normal flow below
    }
  }

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
    // Log error details safely without passing non-serializable objects
    // Use console.warn and only log in development (errors are handled gracefully in UI)
    const errorMsg =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : String(error || "Unknown error");
    if (process.env.NODE_ENV === "development") {
      console.warn("Failed to fetch brands:", errorMsg);
    }
    return null;
  }
}
