import { auth } from "@clerk/nextjs/server";

const REWARDS_API_URL = process.env.NEXT_PUBLIC_REWARDS_API_URL || "http://localhost:3000/api";

/**
 * Server-side API client for the Rewards API
 * Automatically attaches Clerk JWT token to requests
 * Throws plain objects (not Error instances) to ensure serializability
 */
export async function adminApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!REWARDS_API_URL) {
    const error: { status: number; statusText: string; message: string } = {
      status: 500,
      statusText: "Configuration Error",
      message: "REWARDS_API_URL is not configured",
    };
    throw error;
  }

  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    const error: { status: number; statusText: string; message: string } = {
      status: 401,
      statusText: "Unauthorized",
      message: "No Clerk token available for admin API call",
    };
    throw error;
  }

  const url = `${REWARDS_API_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let errorMessage = `Admin API error ${res.status}`;
    let responseText = "";

    try {
      // Try to read response as text first
      responseText = await res.text();

      // Try to parse as JSON
      if (responseText) {
        try {
          const jsonData = JSON.parse(responseText);
          if (jsonData && typeof jsonData === "object") {
            errorMessage = String(jsonData.error || jsonData.message || errorMessage);
          } else if (typeof jsonData === "string") {
            errorMessage = jsonData;
          }
        } catch {
          // Not JSON, use the text as error message if it's not too long
          if (responseText.length < 200) {
            errorMessage = responseText;
          }
        }
      }
    } catch (readError) {
      // If we can't read the response, use status-based message
      const readErrorMsg = readError instanceof Error ? readError.message : String(readError);
      console.error("Failed to read error response:", readErrorMsg);
    }

    // Create a plain object literal with only serializable primitives
    const statusCode = Number(res.status) || 500;
    const statusTextValue = String(res.statusText || "Unknown");
    const messageValue = String(errorMessage || `Admin API error ${statusCode}`);
    const pathValue = String(path || "");

    // Log error details separately to avoid serialization issues
    console.error(`Admin API error [${statusCode}]: ${messageValue}`);
    console.error(`  Path: ${pathValue}`);
    console.error(`  URL: ${url}`);
    console.error(`  Status: ${statusTextValue}`);

    // Create error payload with explicit values
    const errorPayload: { status: number; statusText: string; message: string; path: string } = {
      status: statusCode,
      statusText: statusTextValue,
      message: messageValue,
      path: pathValue,
    };

    // Throw a plain object that's guaranteed to be serializable
    throw errorPayload;
  }

  return res.json() as Promise<T>;
}
