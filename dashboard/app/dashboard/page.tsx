import { adminApiFetch } from "@/lib/rewardsApi";
import { Brand, BrandSummary } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";

async function getBrands(): Promise<Brand[]> {
  try {
    return await adminApiFetch<Brand[]>("/brands/mine");
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return [];
  }
}

async function getBrandSummary(brandId: string): Promise<BrandSummary | null> {
  try {
    return await adminApiFetch<BrandSummary>(`/brands/${brandId}/summary`);
  } catch (error) {
    console.error("Failed to fetch brand summary:", error);
    return null;
  }
}

export default async function DashboardPage() {
  const brands = await getBrands();
  const selectedBrand = brands[0]; // For MVP, use first brand

  if (!selectedBrand) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card>
          <p className="text-gray-600">
            No brands found. Create a brand to get started.
          </p>
        </Card>
      </div>
    );
  }

  const summary = await getBrandSummary(selectedBrand.id);

  return (
    <div>
      <PageHeader title="Dashboard" description={`Brand: ${selectedBrand.name}`} />

      {summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Total Members
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {summary.totalMembers}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Points Issued
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {summary.totalPointsIssued.toLocaleString()}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Points Redeemed
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {summary.totalPointsRedeemed.toLocaleString()}
            </p>
          </Card>

          <Card className="md:col-span-3">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Outstanding Points
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {summary.outstandingPoints.toLocaleString()}
            </p>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="text-gray-600">
            Loading brand statistics...
          </p>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-semibold mb-4">Brand Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{selectedBrand.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Slug</dt>
            <dd className="mt-1 text-sm text-gray-900">{selectedBrand.slug}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {selectedBrand.isActive ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-red-600">Inactive</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Your Role</dt>
            <dd className="mt-1 text-sm text-gray-900">{selectedBrand.role || "N/A"}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

