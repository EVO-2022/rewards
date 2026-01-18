import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getFirstBrand } from "@/lib/brandHelper";
import { adminApiFetch } from "@/lib/server/rewardsApi";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const authData = await auth();

  if (!authData.userId) {
    redirect("/sign-in");
  }

  // Determine brandId: use NEXT_PUBLIC_BRAND_ID or get first brand
  const brandIdFromEnv = process.env.NEXT_PUBLIC_BRAND_ID;
  let brandId: string | null = brandIdFromEnv || null;
  let brandName = "Your Brand";

  if (!brandId) {
    const brand = await getFirstBrand();
    if (brand) {
      brandId = brand.id;
      brandName = brand.name;
    }
  }

  if (!brandId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Customer Portal</h1>
          <p className="text-gray-600">No brand found. Please contact support.</p>
        </div>
      </div>
    );
  }

  // Get balance for current user
  let balance = 0;
  let userId: string | null = null;
  try {
    const balanceData = await adminApiFetch<{ balance: number; userId: string; brandId: string }>(
      `/portal/${brandId}/balance`,
      { method: "GET" }
    );
    balance = balanceData.balance || 0;
    userId = balanceData.userId || null;
  } catch (error) {
    console.error("Error fetching balance:", error);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Customer Portal</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{brandName}</h2>
          <div>
            <p className="text-3xl font-bold text-blue-600 mb-2">{balance}</p>
            <p className="text-gray-600">Points Available</p>
          </div>
        </div>
        <div className="mt-6">
          <Link
            href={`/portal/redeem?brandId=${brandId}`}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Redeem Points
          </Link>
        </div>
      </div>
    </div>
  );
}
