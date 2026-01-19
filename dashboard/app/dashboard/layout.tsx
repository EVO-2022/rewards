import { redirect } from "next/navigation";
import { adminApiFetch } from "@/lib/server/rewardsApi";
import { Brand } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Dashboard layout - checks user role and redirects VIEWER users to portal
 * This runs before any dashboard pages render
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check user role BEFORE rendering any dashboard content
  try {
    const brands = await adminApiFetch<Brand[]>("/brands/mine", { method: "GET" });
    const userBrands = Array.isArray(brands) ? brands : [];

    if (userBrands.length > 0) {
      const hasAdminRole = userBrands.some(
        (b: any) => b.role === "OWNER" || b.role === "MANAGER"
      );

      // If user is VIEWER, redirect to portal IMMEDIATELY
      // This happens at the layout level, so no dashboard pages will render
      if (!hasAdminRole) {
        redirect("/portal");
      }
    }
  } catch (error: any) {
    // If redirect() was called, it throws - rethrow it
    if (error && typeof error === "object" && "digest" in error && 
        typeof error.digest === "string" && error.digest.includes("NEXT_REDIRECT")) {
      throw error;
    }
    // If API call fails, continue (client-side will handle it)
    console.error("Error checking user role in dashboard layout:", error);
  }

  return <>{children}</>;
}
