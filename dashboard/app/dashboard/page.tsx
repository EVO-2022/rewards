import { BrandSummary } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { getFirstBrand } from "@/lib/brandHelper";
import { adminApiFetch } from "@/lib/rewardsApi";

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
  let brand = null;
  let errorMessage: string | null = null;
  let summary: BrandSummary | null = null;

  try {
    brand = await getFirstBrand();
    if (!brand) {
      return (
        <div>
          <PageHeader title="Dashboard" />
          <Card>
            <div className="text-center py-12">
              <p className="text-lg font-medium text-gray-900 mb-2">
                You don't have any brands yet.
              </p>
              <p className="text-gray-600">
                Once you create your first brand, you'll see stats, members, and redemptions here.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    summary = await adminApiFetch<BrandSummary>(`/brands/${brand.id}/summary`);
  } catch (err: any) {
    // Ensure this is always a plain string
    if (err && typeof err === "object") {
      errorMessage = (err.message as string) || JSON.stringify(err);
    } else {
      errorMessage = String(err);
    }
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card>
          <div className="p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Dashboard Error</h1>
            <p className="text-gray-700">{errorMessage}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!brand || !summary) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card>
          <p className="text-gray-600">Loading brand statistics...</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={brand.name} description={`${brand.slug} • Overview`} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Member Count</h3>
          <p className="text-3xl font-bold text-gray-900">{summary.memberCount.toLocaleString()}</p>
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
    </div>
  );
}
