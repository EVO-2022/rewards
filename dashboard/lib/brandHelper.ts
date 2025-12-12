import { adminApiFetch } from "@/lib/server/rewardsApi";
import type { Brand } from "@/lib/types";

export async function getFirstBrand(): Promise<Brand | null> {
  const brands = await adminApiFetch<Brand[]>("/brands/mine", { method: "GET" });
  console.log("[getFirstBrand] /brands/mine returned", {
    count: Array.isArray(brands) ? brands.length : "not-array",
    first: brands?.[0] ? { id: brands[0].id, name: brands[0].name } : null,
  });
  return Array.isArray(brands) && brands.length > 0 ? brands[0] : null;
}
