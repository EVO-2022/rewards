import { adminApiFetch } from "@/lib/rewardsApi";
import { BrandApiKey } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { CopyField } from "@/components/CopyField";
import { getFirstBrand } from "@/lib/brandHelper";
import Link from "next/link";

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateString);
  }
}

export default async function DevelopersPage() {
  let brand = null;
  let errorMessage: string | null = null;
  let apiKeys: BrandApiKey[] = [];

  try {
    brand = await getFirstBrand();

    if (!brand) {
      return (
        <div>
          <PageHeader title="Developers" />
          <Card>
            <div className="text-center py-12">
              <p className="text-lg font-medium text-gray-900 mb-2">
                You don't have any brands yet.
              </p>
              <p className="text-gray-600 mb-4">
                Create your first brand to see integration details and API keys here.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </Card>
        </div>
      );
    }

    // Fetch API keys for this brand
    try {
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
    } catch (keysError: unknown) {
      // If API keys fail, log but don't fail the whole page
      // Use console.warn and only log in development (errors are handled gracefully in UI)
      const keysErrorMsg =
        keysError && typeof keysError === "object" && "message" in keysError
          ? String(keysError.message)
          : String(keysError || "Unknown error");
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to fetch API keys:", keysErrorMsg);
      }
      apiKeys = [];
    }
  } catch (err: unknown) {
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
        <PageHeader title="Developers" />
        <Card>
          <div className="p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">
              Error Loading Developer Data
            </h1>
            <p className="text-gray-700">{errorMessage}</p>
            <p className="mt-4 text-sm text-gray-500">Please try again later.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!brand) {
    return (
      <div>
        <PageHeader title="Developers" />
        <Card>
          <p className="text-gray-600">Failed to load brand information.</p>
        </Card>
      </div>
    );
  }

  // Compute API base URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_REWARDS_API_URL || "http://localhost:3000/api";
  const isFallbackUrl = !process.env.NEXT_PUBLIC_REWARDS_API_URL;
  const exampleExternalUserId = "user-123";

  // Generate integration examples
  const curlWhoami = `curl -X GET "${apiBaseUrl}/integration/whoami" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE"`;

  const curlIssuePoints = `curl -X POST "${apiBaseUrl}/integration/points/issue" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
  "externalUserId": "${exampleExternalUserId}",
  "points": 50,
  "reason": "purchase",
  "metadata": {
    "orderId": "ORD-123",
    "source": "website"
  }
}'`;

  const curlGetBalance = `curl -X GET "${apiBaseUrl}/integration/points/balance?externalUserId=${exampleExternalUserId}" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE"`;

  const curlRedeemPoints = `curl -X POST "${apiBaseUrl}/integration/points/redeem" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
  "externalUserId": "${exampleExternalUserId}",
  "points": 20,
  "reason": "reward_checkout",
  "metadata": {
    "orderId": "ORD-456",
    "source": "website"
  }
}'`;

  const nodeExample = `const apiKey = process.env.REWARDS_API_KEY;
const apiBaseUrl = "${apiBaseUrl}";

async function issuePoints() {
  const response = await fetch(\`\${apiBaseUrl}/integration/points/issue\`, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      externalUserId: "${exampleExternalUserId}",
      points: 50,
      reason: "purchase",
      metadata: {
        orderId: "ORD-123",
        source: "website",
      },
    }),
  });

  const data = await response.json();
  console.log("Points issued:", data);
}

issuePoints();`;

  return (
    <div>
      <PageHeader title="Developers" description="Integration guide and API documentation" />

      {/* Brand Details Section */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Brand Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
            <p className="text-gray-900">{brand.name}</p>
          </div>
          <CopyField label="Brand ID" value={brand.id} mono={true} />
          <div>
            <CopyField label="API Base URL" value={apiBaseUrl} mono={true} />
            {isFallbackUrl && (
              <p className="mt-2 text-sm text-amber-600">
                ⚠️ Using fallback URL. Set NEXT_PUBLIC_REWARDS_API_URL for production.
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Use this base URL in your integration code.
            </p>
          </div>
        </div>
      </Card>

      {/* API Keys Section */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">API Keys</h2>
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No API keys found for this brand.</p>
            <Link
              href="/dashboard/api-keys"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create API Key
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {key.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(key.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(key.lastUsedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            key.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {key.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              You can create new keys on the{" "}
              <Link href="/dashboard/api-keys" className="text-blue-600 hover:underline">
                API Keys page
              </Link>
              .
            </p>
          </>
        )}
      </Card>

      {/* Integration Examples Section */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Integration Examples</h2>

        <div className="space-y-6">
          {/* cURL Examples */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">cURL Examples</h3>
            <div className="space-y-4">
              <CopyField label="Whoami" value={curlWhoami} mono={true} />
              <CopyField label="Issue Points" value={curlIssuePoints} mono={true} />
              <CopyField label="Get Balance" value={curlGetBalance} mono={true} />
              <CopyField label="Redeem Points" value={curlRedeemPoints} mono={true} />
            </div>
          </div>

          {/* Node.js Example */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Node.js Example</h3>
            <CopyField label="Node.js: Issue Points" value={nodeExample} mono={true} />
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Replace{" "}
            <code className="bg-blue-100 px-1 rounded">YOUR_API_KEY_HERE</code> with your actual API
            key. API keys are only shown once when created.
          </p>
        </div>
      </Card>
    </div>
  );
}
