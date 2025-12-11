import { BrandSummary, Brand } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { CreateBrandForm } from "@/components/CreateBrandForm";
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
  let brand: Brand | null = null;
  let errorMessage: string | null = null;
  let summary: BrandSummary | null = null;

  try {
    brand = await getFirstBrand();
    if (!brand) {
      return (
        <div>
          <PageHeader title="Dashboard" />
          <div className="max-w-2xl">
            <div className="mb-6">
              <p className="text-lg font-medium text-gray-900 mb-2">
                You don't have any brands yet.
              </p>
              <p className="text-gray-600">
                Create your first brand to get started with managing rewards, members, and API keys.
              </p>
            </div>
            <CreateBrandForm />
          </div>
        </div>
      );
    }

    // Ensure brand is fully serializable before using
    brand = {
      id: String(brand.id),
      name: String(brand.name),
      slug: String(brand.slug),
      description: brand.description ? String(brand.description) : undefined,
      isActive: Boolean(brand.isActive),
      createdAt: String(brand.createdAt),
      role: brand.role ? (brand.role as "OWNER" | "MANAGER" | "VIEWER") : undefined,
      joinedAt: brand.joinedAt ? String(brand.joinedAt) : undefined,
    };

    summary = await adminApiFetch<BrandSummary>(`/brands/${brand.id}/summary`);
  } catch (err: any) {
    // Ensure this is always a plain string - never pass the error object
    if (err && typeof err === "object" && err !== null) {
      errorMessage = String(err.message || JSON.stringify(err));
    } else {
      errorMessage = String(err || "Unknown error");
    }
    // Clear brand to prevent passing non-serializable data
    brand = null;
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
