import { auth } from "@clerk/nextjs/server";

// Force dynamic rendering since we use auth() which requires headers()
export const dynamic = "force-dynamic";

export default async function DebugMePage() {
  const authData = await auth();

  if (!authData.userId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-medium mb-4">Debug: Current User</h1>
        <p className="text-gray-300">Not signed in</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-medium mb-4">Debug: Current User</h1>
      <div className="font-mono text-sm space-y-2">
        <div>
          <span className="font-medium">User ID:</span> {authData.userId}
        </div>
        <div>
          <span className="font-medium">Session ID:</span> {authData.sessionId ?? "null"}
        </div>
        <div>
          <span className="font-medium">Org ID:</span> {authData.orgId ?? "null"}
        </div>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-medium mb-2">Full Auth Object:</h2>
        <pre className="bg-gray-800 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(
            {
              userId: authData.userId,
              sessionId: authData.sessionId,
              orgId: authData.orgId,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
