import { BrandSummary } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";

async function getBrandSummary(brandId: string): Promise<BrandSummary | null> {
  try {
    const { adminApiFetch } = await import("@/lib/rewardsApi");
    return await adminApiFetch<BrandSummary>(`/brands/${brandId}/summary`);
  } catch (error) {
    console.error("Failed to fetch brand summary:", error);
    return null;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const brandId = process.env.NEXT_PUBLIC_BRAND_ID!;

  if (!brandId) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card>
          <p className="text-gray-600">
            NEXT_PUBLIC_BRAND_ID is not configured. Please set it in your environment variables.
          </p>
        </Card>
      </div>
    );
  }

  const summary = await getBrandSummary(brandId);

  return (
    <div>
      <PageHeader title={summary?.name || "Dashboard"} description={`${summary?.slug || ""} • Overview`} />

      {summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Member Count</h3>
              <p className="text-3xl font-bold text-gray-900">
                {summary.memberCount.toLocaleString()}
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Points Issued</h3>
              <p className="text-3xl font-bold text-gray-900">
                {summary.totalPointsIssued.toLocaleString()}
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Points Burned</h3>
              <p className="text-3xl font-bold text-gray-900">
                {summary.totalPointsBurned.toLocaleString()}
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Current Liability</h3>
              <p className="text-3xl font-bold text-gray-900">
                {summary.currentLiability.toLocaleString()}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Redemptions</h3>
              <p className="text-3xl font-bold text-gray-900">
                {summary.totalRedemptions.toLocaleString()}
              </p>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>Completed: {summary.completedRedemptions}</div>
                <div>Pending: {summary.pendingRedemptions}</div>
                <div>Failed: {summary.failedRedemptions}</div>
              </div>
            </Card>

            <Card className="md:col-span-3">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last Activity</h3>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(summary.lastActivityAt)}
              </p>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <p className="text-gray-600">Loading brand statistics...</p>
        </Card>
      )}
    </div>
  );
}
