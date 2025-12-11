import { auth } from "@clerk/nextjs/server";

// Force dynamic rendering since we use auth() which requires headers()
export const dynamic = "force-dynamic";

export default async function DebugMePage() {
  const authData = await auth();

  if (!authData.userId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Debug: Current User</h1>
        <p className="text-gray-600">Not signed in</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold mb-4">Debug: Current User</h1>
      <div className="font-mono text-sm space-y-2">
        <div>
          <span className="font-semibold">User ID:</span> {authData.userId}
        </div>
        <div>
          <span className="font-semibold">Session ID:</span> {authData.sessionId ?? "null"}
        </div>
        <div>
          <span className="font-semibold">Org ID:</span> {authData.orgId ?? "null"}
        </div>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Full Auth Object:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(authData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
