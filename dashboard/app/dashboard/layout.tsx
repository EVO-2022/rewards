import { redirect } from "next/navigation";
import { adminApiFetch } from "@/lib/server/rewardsApi";
import { Brand } from "@/lib/types";
import { ViewerRedirect } from "@/components/ViewerRedirect";
import { DashboardSidebar } from "@/components/DashboardSidebar";

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
  let shouldRedirect = false;
  
  try {
    const brands = await adminApiFetch<Brand[]>("/brands/mine", { method: "GET" });
    const userBrands = Array.isArray(brands) ? brands : [];

    // Check if user has any brands
    if (userBrands.length > 0) {
      const hasAdminRole = userBrands.some(
        (b: any) => b.role === "OWNER" || b.role === "MANAGER"
      );

      // If user is VIEWER (has brands but no admin role), redirect to /home IMMEDIATELY
      if (!hasAdminRole) {
        shouldRedirect = true;
      }
    }
  } catch (error: any) {
    // If redirect() was called, it throws with NEXT_REDIRECT digest - rethrow it
    if (error && typeof error === "object" && "digest" in error) {
      const digest = String(error.digest || "");
      if (digest.includes("NEXT_REDIRECT")) {
        throw error; // Re-throw redirect errors
      }
    }
    // If API call fails, log but continue (client-side ViewerRedirect will handle it)
    console.error("[DashboardLayout] Error checking user role:", error);
  }

  // If we determined the user should be redirected, do it now
  if (shouldRedirect) {
    redirect("/home");
  }

  // Wrap children with ViewerRedirect component as backup
  return (
    <>
      <ViewerRedirect />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1 md:ml-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
