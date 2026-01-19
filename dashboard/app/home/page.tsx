import { adminApiFetch } from "@/lib/server/rewardsApi";
import { Brand } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let brands: Brand[] = [];
  let errorMessage: string | null = null;

  try {
    const brandsData = await adminApiFetch<Brand[]>("/brands/mine", { method: "GET" });
    brands = Array.isArray(brandsData) ? brandsData : [];
    
    // Debug: log if brands is empty (shouldn't be empty if user has brands)
    if (brands.length === 0) {
      console.log("[HomePage] No brands returned from API");
    }
  } catch (error: unknown) {
    console.error("[HomePage] Error fetching brands:", error);
    if (error && typeof error === "object" && "message" in error) {
      errorMessage = String(error.message);
    } else {
      errorMessage = "Failed to load your information. Please try refreshing the page.";
    }
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Home" />
        <Card>
          <div className="p-6">
            <h1 className="text-xl font-medium text-red-600 mb-2">Error Loading Brands</h1>
            <p className="text-gray-300 mb-4">{errorMessage}</p>
            <p className="text-sm text-gray-400">
              If you believe you should have access to brands, please contact support or try refreshing the page.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Home" description="Your rewards and brands" />

      <div className="space-y-6">
        {brands.length === 0 ? (
          <Card>
            <div className="p-6 text-center">
              <p className="text-lg font-medium text-gray-100 mb-2">
                You&apos;re not a member of any brands yet.
              </p>
              <p className="text-gray-300">
                Contact a brand administrator to be added to a brand.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {brands.map((brand) => (
              <Card key={brand.id}>
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-100 mb-2">{brand.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {brand.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Your Role</span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {brand.role || "VIEWER"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <a
                      href="/portal"
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      View Points & Redeem →
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
