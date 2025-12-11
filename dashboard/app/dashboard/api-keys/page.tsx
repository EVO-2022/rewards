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
  const brandId = process.env.NEXT_PUBLIC_BRAND_ID;
  const selectedBrand = brandId ? { id: brandId } : await getFirstBrand();

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
      <PageHeader title="API Keys" description={apiKeys.length > 0 ? `Brand: ${apiKeys[0].brandId}` : "API Keys"} />

      <ApiKeysTable brandId={selectedBrand.id} initialKeys={apiKeys} />
    </div>
  );
}
