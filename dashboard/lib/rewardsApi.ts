import { auth } from "@clerk/nextjs/server";

const REWARDS_API_URL = process.env.NEXT_PUBLIC_REWARDS_API_URL || "http://localhost:3000/api";

/**
 * Server-side API client for the Rewards API
 * Automatically attaches Clerk JWT token to requests
 * Throws plain objects (not Error instances) to ensure serializability
 */
export async function adminApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!REWARDS_API_URL) {
    throw {
      status: 500,
      statusText: "Configuration Error",
      message: "REWARDS_API_URL is not configured",
    };
  }

  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    throw {
      status: 401,
      statusText: "Unauthorized",
      message: "No Clerk token available for admin API call",
    };
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
    let details: any = null;
    try {
      details = await res.json();
    } catch {
      // ignore JSON parse errors
    }

    const errorPayload = {
      status: res.status,
      statusText: res.statusText,
      details,
      message: details?.error || details?.message || `Admin API error ${res.status}`,
    };

    console.error("Admin API error", errorPayload);

    // Return a typed error object instead of throwing a class instance.
    // Callers must handle this explicitly.
    throw errorPayload;
  }

  return res.json() as Promise<T>;
}
