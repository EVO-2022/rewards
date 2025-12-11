import { adminApiFetch } from "@/lib/rewardsApi";
import { BrandMembersResponse } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { MembersTable } from "@/components/MembersTable";
import { getFirstBrand } from "@/lib/brandHelper";

async function getBrandMembers(brandId: string): Promise<BrandMembersResponse | null> {
  try {
    return await adminApiFetch<BrandMembersResponse>(
      `/brands/${brandId}/members?page=1&pageSize=100`
    );
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return null;
  }
}

export default async function MembersPage() {
  const brand = await getFirstBrand();

  if (!brand) {
    return (
      <div>
        <PageHeader title="Members" />
        <Card>
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-900 mb-2">You don't have any brands yet.</p>
            <p className="text-gray-600">Brand creation UI will go here.</p>
          </div>
        </Card>
      </div>
    );
  }

  const membersData = await getBrandMembers(brand.id);

  return (
    <div>
      <PageHeader title="Members" description={`Brand: ${brand.name}`} />

      {membersData ? (
        <Card>
          <div className="mb-4">
            <p className="text-sm text-gray-600">Total members: {membersData.total}</p>
          </div>
          <MembersTable members={membersData.members} />
        </Card>
      ) : (
        <Card>
          <p className="text-gray-600">Failed to load members.</p>
        </Card>
      )}
    </div>
  );
}
