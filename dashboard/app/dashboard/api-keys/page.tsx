import { adminApiFetch } from "@/lib/rewardsApi";
import { BrandApiKey } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ApiKeysTable } from "@/components/ApiKeysTable";
import { getFirstBrand } from "@/lib/brandHelper";

async function getApiKeys(brandId: string): Promise<BrandApiKey[]> {
  try {
    return await adminApiFetch<BrandApiKey[]>(`/brands/${brandId}/api-keys`);
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return [];
  }
}

export default async function ApiKeysPage() {
  const brand = await getFirstBrand();

  if (!brand) {
    return (
      <div>
        <PageHeader title="API Keys" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-900 mb-2">You don't have any brands yet.</p>
            <p className="text-gray-600">Brand creation UI will go here.</p>
          </div>
        </div>
      </div>
    );
  }

  const apiKeys = await getApiKeys(brand.id);

  return (
    <div>
      <PageHeader title="API Keys" description={`Brand: ${brand.name}`} />

      <ApiKeysTable brandId={brand.id} initialKeys={apiKeys} />
    </div>
  );
}
