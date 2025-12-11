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
  const brandId = process.env.NEXT_PUBLIC_BRAND_ID;
  const selectedBrand = brandId ? { id: brandId } : await getFirstBrand();

  if (!selectedBrand) {
    return (
      <div>
        <PageHeader title="Members" />
        <Card>
          <p className="text-gray-600">No brands found.</p>
        </Card>
      </div>
    );
  }

  const membersData = await getBrandMembers(selectedBrand.id);

  return (
    <div>
      <PageHeader title="Members" description={membersData ? `Brand: ${membersData.brandId}` : "Members"} />

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
