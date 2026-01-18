import { adminApiFetch } from "@/lib/server/rewardsApi";
import { RewardLedger } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { getFirstBrand } from "@/lib/brandHelper";

// Force dynamic rendering since we use auth() which requires headers()
export const dynamic = "force-dynamic";

interface LedgerResponse {
  status: "ok";
  brandId: string;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  items: RewardLedger[];
}

function formatDate(dateString: string): string {
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
    return dateString;
  }
}

function formatMetadata(metadata: Record<string, any> | null | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "—";
  }
  try {
    const str = JSON.stringify(metadata);
    return str.length > 50 ? str.substring(0, 50) + "..." : str;
  } catch {
    return String(metadata);
  }
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; type?: string; q?: string }>;
}) {
  let brand = null;
  let errorMessage: string | null = null;
  let ledgerData: LedgerResponse | null = null;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || "50", 10) || 50));
  const type = params.type || "";
  const query = params.q || "";

  try {
    brand = await getFirstBrand();

    if (!brand) {
      return (
        <div>
          <PageHeader title="Ledger" />
          <Card>
            <div className="text-center py-12">
              <p className="text-lg font-medium text-gray-100 mb-2">
                No accessible brands for this user.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    // Build query string
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (type) queryParams.set("type", type);
    if (query) queryParams.set("q", query);

    try {
      ledgerData = await adminApiFetch<LedgerResponse>(
        `/brands/${brand.id}/ledger?${queryParams.toString()}`
      );
    } catch (err) {
      throw err;
    }
  } catch (err: unknown) {
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
    brand = null;
    ledgerData = null;
  }

  if (errorMessage && !ledgerData) {
    return (
      <div>
        <PageHeader title="Ledger" />
        <Card>
          <div className="p-6">
            <h1 className="text-xl font-medium text-red-600 mb-2">Error Loading Ledger</h1>
            <p className="text-gray-300">{errorMessage}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!brand) {
    return (
      <div>
        <PageHeader title="Ledger" />
        <Card>
          <p className="text-gray-300">Failed to load brand information.</p>
        </Card>
      </div>
    );
  }

  const items = (ledgerData as any)?.items ?? [];
  const _total = (ledgerData as any)?.total ?? items.length;

  if (!items.length) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-medium">Ledger</h1>
        <p className="mt-2 text-sm text-gray-300">No ledger activity yet.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Ledger" description={`Points history for ${brand.name}`} />

      <Card>
        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg">
          <form method="get" className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">
                Type
              </label>
              <select
                id="type"
                name="type"
                defaultValue={type}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="ISSUE">Issue</option>
                <option value="BURN">Burn</option>
                <option value="REDEEM">Redeem</option>
                <option value="ADJUST">Adjust</option>
                <option value="MINT">Mint</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="q" className="block text-sm font-medium text-gray-300 mb-1">
                Search (User ID/Email)
              </label>
              <input
                type="text"
                id="q"
                name="q"
                defaultValue={query}
                placeholder="Search..."
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Filter
            </button>
            {(type || query) && (
              <a
                href="/dashboard/ledger"
                className="px-4 py-2 bg-gray-200 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear
              </a>
            )}
          </form>
        </div>

        {/* Table */}
        {!ledgerData || ledgerData.items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-100 mb-2">No ledger entries found.</p>
            <p className="text-gray-300">
              {ledgerData
                ? "Try adjusting your filters or check back later."
                : "Ledger data will appear here once points transactions occur."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-300">
                Showing {ledgerData.items.length} of {ledgerData.total} entries
                {ledgerData.hasMore && " (more available)"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metadata
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {ledgerData.items.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-medium rounded-full ${
                            entry.type === "MINT"
                              ? "bg-green-100 text-green-800"
                              : entry.type === "BURN"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-800 text-gray-800"
                          }`}
                        >
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                        {entry.type === "MINT" ? "+" : "-"}
                        {entry.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-100">
                        {entry.userId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{entry.reason || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <span className="font-mono text-xs">{formatMetadata(entry.metadata)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

