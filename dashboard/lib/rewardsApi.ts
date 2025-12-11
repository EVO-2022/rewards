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
    try {
      const jsonData = await res.json();
      if (jsonData && typeof jsonData === "object") {
        errorMessage = String(jsonData.error || jsonData.message || errorMessage);
      } else if (typeof jsonData === "string") {
        errorMessage = jsonData;
      }
    } catch {
      // ignore JSON parse errors, use default message
    }

    // Create a plain object literal (not Object.create(null)) with only serializable primitives
    const errorPayload: { status: number; statusText: string; message: string } = {
      status: Number(res.status),
      statusText: String(res.statusText || ""),
      message: errorMessage,
    };

    console.error("Admin API error", errorPayload);

    // Throw a plain object that's guaranteed to be serializable
    throw errorPayload;
  }

  return res.json() as Promise<T>;
}
