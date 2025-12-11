import { auth } from "@clerk/nextjs/server";
import { REWARDS_API_URL } from "./config";

/**
 * Server-side API client for the Rewards API
 * Automatically attaches Clerk JWT token to requests
 */
export async function adminApiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    throw new Error("No Clerk token available for admin API call");
  }

  const url = `${REWARDS_API_URL}${path}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMessage = `Admin API error ${res.status}`;
    
    try {
      const errorJson = JSON.parse(text);
      errorMessage = errorJson.error || errorMessage;
    } catch {
      errorMessage = text || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}

