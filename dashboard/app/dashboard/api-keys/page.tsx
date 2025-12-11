import { adminApiFetch } from "@/lib/rewardsApi";
import { BrandApiKey } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ApiKeysTable } from "@/components/ApiKeysTable";
import { getFirstBrand } from "@/lib/brandHelper";

export default async function ApiKeysPage() {
  let brand = null;
  let errorMessage: string | null = null;
  let apiKeys: BrandApiKey[] = [];

  try {
    brand = await getFirstBrand();

    if (!brand) {
      return (
        <div>
          <PageHeader title="API Keys" />
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <p className="text-lg font-medium text-gray-900 mb-2">
                You don't have any brands yet.
              </p>
              <p className="text-gray-600">Brand creation UI will go here.</p>
            </div>
          </div>
        </div>
      );
    }

    apiKeys = await adminApiFetch<BrandApiKey[]>(`/brands/${brand.id}/api-keys`);
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
        <PageHeader title="API Keys" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Error Loading API Keys</h1>
            <p className="text-gray-700">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div>
        <PageHeader title="API Keys" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">Failed to load API keys.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="API Keys" description={`Brand: ${brand.name}`} />

      <ApiKeysTable brandId={brand.id} initialKeys={apiKeys} />
    </div>
  );
}
