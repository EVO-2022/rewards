import { adminApiFetch } from "@/lib/rewardsApi";
import { Brand, BrandMembersResponse } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { MembersTable } from "@/components/MembersTable";

async function getBrands(): Promise<Brand[]> {
  try {
    return await adminApiFetch<Brand[]>("/brands/mine");
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return [];
  }
}

async function getBrandMembers(brandId: string): Promise<BrandMembersResponse | null> {
  try {
    return await adminApiFetch<BrandMembersResponse>(`/brands/${brandId}/members?page=1&pageSize=100`);
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return null;
  }
}

export default async function MembersPage() {
  const brands = await getBrands();
  const selectedBrand = brands[0];

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
      <PageHeader
        title="Members"
        description={`Brand: ${selectedBrand.name}`}
      />

      {membersData ? (
        <Card>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Total members: {membersData.total}
            </p>
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

