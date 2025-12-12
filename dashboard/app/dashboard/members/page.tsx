import { adminApiFetch } from "@/lib/rewardsApi";
import { BrandMembersResponse } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { MembersTable } from "@/components/MembersTable";
import { getFirstBrand } from "@/lib/brandHelper";

// Force dynamic rendering since we use auth() which requires headers()
export const dynamic = "force-dynamic";

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

    // Sanitize membersData to ensure all properties are serializable
    if (membersData) {
      membersData = {
        brandId: String(membersData.brandId || ""),
        page: Number(membersData.page || 1),
        pageSize: Number(membersData.pageSize || 0),
        total: Number(membersData.total || 0),
        members: (membersData.members || []).map((member) => ({
          id: String(member.id || ""),
          userId: String(member.userId || ""),
          email: member.email ? String(member.email) : undefined,
          role: member.role as "OWNER" | "MANAGER" | "VIEWER",
          joinedAt: String(member.joinedAt || ""),
        })),
      };
    }
  } catch (err: any) {
    // Ensure this is always a plain string - never pass the error object
    if (err && typeof err === "object" && err !== null) {
      if ("message" in err && typeof err.message === "string") {
        errorMessage = err.message;
      } else {
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
    // Clear data to prevent passing non-serializable objects
    brand = null;
    membersData = null;
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
