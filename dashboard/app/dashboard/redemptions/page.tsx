import { adminApiFetch } from "@/lib/rewardsApi";
import { Redemption } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { getFirstBrand } from "@/lib/brandHelper";

export default async function RedemptionsPage() {
  let brand = null;
  let errorMessage: string | null = null;
  let redemptions: Redemption[] = [];

  try {
    brand = await getFirstBrand();

    if (!brand) {
      return (
        <div>
          <PageHeader title="Redemptions" />
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

    redemptions = await adminApiFetch<Redemption[]>(`/brands/${brand.id}/redemptions?limit=50`);
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
        <PageHeader title="Redemptions" />
        <Card>
          <div className="p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Error Loading Redemptions</h1>
            <p className="text-gray-700">{errorMessage}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!brand) {
    return (
      <div>
        <PageHeader title="Redemptions" />
        <Card>
          <p className="text-gray-600">Failed to load redemptions.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Redemptions" description={`Brand: ${brand.name}`} />

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
