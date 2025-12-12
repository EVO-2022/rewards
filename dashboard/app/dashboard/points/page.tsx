import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { getFirstBrand } from "@/lib/brandHelper";
import { IssuePointsForm } from "@/components/IssuePointsForm";

// Force dynamic rendering since we use auth() which requires headers()
export const dynamic = "force-dynamic";

export default async function IssuePointsPage() {
  let brand = null;
  let errorMessage: string | null = null;

  try {
    brand = await getFirstBrand();
  } catch (err: unknown) {
    if (err && typeof err === "object" && err !== null) {
      if ("message" in err && typeof err.message === "string") {
        errorMessage = err.message;
      } else {
        errorMessage = JSON.stringify(err);
      }
    } else {
      errorMessage = String(err || "Unknown error");
    }
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Issue Points" />
        <Card>
          <div className="p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Error Loading Page</h1>
            <p className="text-gray-700">{errorMessage}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!brand) {
    return (
      <div>
        <PageHeader title="Issue Points" />
        <Card>
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-900 mb-2">You don't have any brands yet.</p>
            <p className="text-gray-600">Brand creation UI will go here.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Issue Points" description={`Issue points for ${brand.name}`} />
      <IssuePointsForm brandId={brand.id} brandName={brand.name} />
    </div>
  );
}
