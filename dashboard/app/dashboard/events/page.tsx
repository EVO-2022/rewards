import { getBrandEvents } from "@/lib/server/rewardsApi";
import { AdminEventListResponse, AdminEventLogItem } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { getFirstBrand } from "@/lib/brandHelper";
import { EventsTable } from "@/components/EventsTable";

// Force dynamic rendering since we use auth() which requires headers()
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let brand = null;
  let errorMessage: string | null = null;
  let eventsData: AdminEventListResponse | null = null;

  try {
    brand = await getFirstBrand();

    if (!brand) {
      return (
        <div>
          <PageHeader title="Events" />
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

    eventsData = await getBrandEvents(brand.id, 1, 50);

    // Sanitize eventsData to ensure all properties are serializable
    if (eventsData) {
      eventsData = {
        status: "ok" as const,
        brandId: String(eventsData.brandId || ""),
        page: Number(eventsData.page || 1),
        pageSize: Number(eventsData.pageSize || 0),
        total: Number(eventsData.total || 0),
        hasMore: Boolean(eventsData.hasMore || false),
        items: (eventsData.items || []).map((item: AdminEventLogItem) => ({
          id: String(item.id || ""),
          brandId: String(item.brandId || ""),
          externalUserId: item.externalUserId ? String(item.externalUserId) : null,
          eventName: String(item.eventName || ""),
          metadata: item.metadata || null,
          createdAt: String(item.createdAt || ""),
        })),
      };
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
    eventsData = null;
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Events" />
        <Card>
          <div className="p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Error Loading Events</h1>
            <p className="text-gray-700">{errorMessage}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!brand || !eventsData) {
    return (
      <div>
        <PageHeader title="Events" />
        <Card>
          <p className="text-gray-600">Failed to load events.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Events" description={`Brand: ${brand.name}`} />

      <Card>
        {eventsData.items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-900 mb-2">No events received yet.</p>
            <p className="text-gray-600">
              Once your app sends events to the integration endpoint, they'll show up here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Total events: {eventsData.total} {eventsData.hasMore && "(showing first 50)"}
              </p>
            </div>
            <EventsTable events={eventsData.items} />
          </>
        )}
      </Card>
    </div>
  );
}
