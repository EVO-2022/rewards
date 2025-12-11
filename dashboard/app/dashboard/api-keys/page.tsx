import { adminApiFetch } from "@/lib/rewardsApi";
import { Brand, BrandApiKey } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { ApiKeysTable } from "@/components/ApiKeysTable";

async function getBrands(): Promise<Brand[]> {
  try {
    return await adminApiFetch<Brand[]>("/brands/mine");
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return [];
  }
}

async function getApiKeys(brandId: string): Promise<BrandApiKey[]> {
  try {
    return await adminApiFetch<BrandApiKey[]>(`/brands/${brandId}/api-keys`);
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return [];
  }
}

export default async function ApiKeysPage() {
  const brands = await getBrands();
  const selectedBrand = brands[0];

  if (!selectedBrand) {
    return (
      <div>
        <PageHeader title="API Keys" />
        <Card>
          <p className="text-gray-600">No brands found.</p>
        </Card>
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

