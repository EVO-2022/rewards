import { adminApiFetch } from "@/lib/rewardsApi";
import { Redemption } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { getFirstBrand } from "@/lib/brandHelper";

async function getRedemptions(brandId: string): Promise<Redemption[]> {
  try {
    return await adminApiFetch<Redemption[]>(`/brands/${brandId}/redemptions?limit=50`);
  } catch (error) {
    console.error("Failed to fetch redemptions:", error);
    return [];
  }
}

export default async function RedemptionsPage() {
  const selectedBrand = await getFirstBrand();

  if (!selectedBrand) {
    return (
      <div>
        <PageHeader title="Redemptions" />
        <Card>
          <p className="text-gray-600">No brands found.</p>
        </Card>
      </div>
    );
  }

  const redemptions = await getRedemptions(selectedBrand.id);

  return (
    <div>
      <PageHeader
        title="Redemptions"
        description={`Brand: ${selectedBrand.name}`}
      />

      <Card>
        {redemptions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No redemptions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {redemptions.map((redemption) => (
                  <tr key={redemption.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {redemption.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {redemption.pointsUsed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          redemption.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : redemption.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {redemption.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(redemption.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

