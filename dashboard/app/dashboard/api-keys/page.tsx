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
  const selectedBrand = await getFirstBrand();

  if (!selectedBrand) {
    return (
      <div>
        <PageHeader title="API Keys" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">No brands found.</p>
        </div>
      </div>
    );
  }

  const apiKeys = await getApiKeys(selectedBrand.id);

  return (
    <div>
      <PageHeader
        title="API Keys"
        description={`Brand: ${selectedBrand.name}`}
      />

      <ApiKeysTable brandId={selectedBrand.id} initialKeys={apiKeys} />
    </div>
  );
}

