import { adminApiFetch } from "@/lib/rewardsApi";
import { BrandMembersResponse } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { MembersTable } from "@/components/MembersTable";
import { getFirstBrand } from "@/lib/brandHelper";

export default async function MembersPage() {
  let brand = null;
  let errorMessage: string | null = null;
  let membersData: BrandMembersResponse | null = null;

  try {
    brand = await getFirstBrand();

    if (!brand) {
      return (
        <div>
          <PageHeader title="Members" />
          <Card>
            <div className="text-center py-12">
              <p className="text-lg font-medium text-gray-900 mb-2">
                You don't have any brands yet.
              </p>
              <p className="text-gray-600">Brand creation UI will go here.</p>
            </div>
          </Card>
        </div>
      );
    }

    membersData = await adminApiFetch<BrandMembersResponse>(
      `/brands/${brand.id}/members?page=1&pageSize=100`
    );
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
        <PageHeader title="Members" />
        <Card>
          <div className="p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Error Loading Members</h1>
            <p className="text-gray-700">{errorMessage}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!brand || !membersData) {
    return (
      <div>
        <PageHeader title="Members" />
        <Card>
          <p className="text-gray-600">Failed to load members.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Members" description={`Brand: ${brand.name}`} />

      <Card>
        <div className="mb-4">
          <p className="text-sm text-gray-600">Total members: {membersData.total}</p>
        </div>
        <MembersTable members={membersData.members} />
      </Card>
    </div>
  );
}
