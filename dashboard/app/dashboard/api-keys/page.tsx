import { adminApiFetch } from "@/lib/rewardsApi";
import { BrandApiKey } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ApiKeysTable } from "@/components/ApiKeysTable";
import { getFirstBrand } from "@/lib/brandHelper";

// Force dynamic rendering since we use auth() which requires headers()
export const dynamic = "force-dynamic";

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

    // Sanitize apiKeys array to ensure all items are serializable
    apiKeys = (apiKeys || []).map((key) => ({
      id: String(key.id || ""),
      brandId: String(key.brandId || ""),
      name: String(key.name || ""),
      isActive: Boolean(key.isActive),
      createdAt: String(key.createdAt || ""),
      lastUsedAt: key.lastUsedAt ? String(key.lastUsedAt) : null,
    }));
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
    apiKeys = [];
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
