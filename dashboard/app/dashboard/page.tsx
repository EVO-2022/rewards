import { BrandSummary, Brand } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { CreateBrandForm } from "@/components/CreateBrandForm";
import { getFirstBrand } from "@/lib/brandHelper";
import { adminApiFetch } from "@/lib/rewardsApi";

// Force dynamic rendering since we use auth() which requires headers()
export const dynamic = "force-dynamic";

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
    
    // Log in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[DashboardPage] getFirstBrand returned:", {
        brand: brand ? { id: brand.id, name: brand.name, slug: brand.slug } : null,
      });
    }
    
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

    try {
      summary = await adminApiFetch<BrandSummary>(`/brands/${brand.id}/summary`);
    } catch (summaryError: unknown) {
      // Log error from getBrandSummary in development
      if (process.env.NODE_ENV !== "production") {
      const summaryErrorMsg =
        summaryError &&
        typeof summaryError === "object" &&
        summaryError !== null &&
        "message" in summaryError
          ? String(summaryError.message)
          : String(summaryError || "Unknown error");
        console.error("[DashboardPage] Error fetching brand summary:", summaryErrorMsg);
      }
      // Re-throw to be caught by outer catch block
      throw summaryError;
    }

    // Sanitize summary to ensure all properties are serializable
    if (summary) {
      summary = {
        brandId: String(summary.brandId || ""),
        name: String(summary.name || ""),
        slug: String(summary.slug || ""),
        memberCount: Number(summary.memberCount || 0),
        totalPointsIssued: Number(summary.totalPointsIssued || 0),
        totalPointsBurned: Number(summary.totalPointsBurned || 0),
        currentLiability: Number(summary.currentLiability || 0),
        totalRedemptions: Number(summary.totalRedemptions || 0),
        completedRedemptions: Number(summary.completedRedemptions || 0),
        pendingRedemptions: Number(summary.pendingRedemptions || 0),
        failedRedemptions: Number(summary.failedRedemptions || 0),
        lastActivityAt: summary.lastActivityAt ? String(summary.lastActivityAt) : null,
      };
    }
  } catch (err: any) {
    // Ensure this is always a plain string - never pass the error object
    // Handle empty objects, Error instances, and plain objects
    if (err && typeof err === "object" && err !== null) {
      if ("message" in err && typeof err.message === "string") {
        errorMessage = err.message;
      } else {
        // For empty objects or objects without message, create a generic message
        const keys = Object.keys(err);
        if (keys.length === 0) {
          errorMessage = "An unknown error occurred";
        } else {
          errorMessage = JSON.stringify(err);
        }
      }
    } else {
      errorMessage = String(err || "Unknown error");
    }
    // Clear brand and summary to prevent passing non-serializable data
    brand = null;
    summary = null;
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
