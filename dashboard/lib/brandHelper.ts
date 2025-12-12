import { adminApiFetch } from "@/lib/server/rewardsApi";
import type { Brand } from "@/lib/types";

export async function getFirstBrand(): Promise<Brand | null> {
  const brands = await adminApiFetch<Brand[]>("/brands/mine", { method: "GET" });
  return Array.isArray(brands) && brands.length > 0 ? brands[0] : null;
}
