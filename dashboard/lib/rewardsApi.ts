import { auth } from "@clerk/nextjs/server";
import type { AdminEventListResponse } from "./types";

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

  let token: string | null = null;

  try {
    const authResult = await auth();
    if (authResult?.getToken) {
      token = await authResult.getToken();
    }
  } catch (authError: unknown) {
    // Safely handle auth errors - convert to string to avoid serialization issues
    // Never pass the error object itself, only convert to string for logging
    let errorMsg = "Authentication error";
    if (authError) {
      if (typeof authError === "object" && authError !== null) {
        if ("message" in authError && typeof authError.message === "string") {
          errorMsg = authError.message;
        } else if ("toString" in authError && typeof authError.toString === "function") {
          errorMsg = authError.toString();
        }
      } else {
        errorMsg = String(authError);
      }
    }
    console.error("Auth error in adminApiFetch:", errorMsg);
    // Throw a plain object that's guaranteed to be serializable
    const error: { status: number; statusText: string; message: string } = {
      status: 401,
      statusText: "Unauthorized",
      message: "Authentication failed",
    };
    throw error;
  }

  if (!token) {
    const error: { status: number; statusText: string; message: string } = {
      status: 401,
      statusText: "Unauthorized",
      message: "No Clerk token available for admin API call",
    };
    throw error;
  }

  const url = `${REWARDS_API_URL}${path}`;
  const method = options.method || "GET";

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
    // Read the response body as text
    const errorText = await res.text().catch(() => "");

    // Build detailed error message
    const statusCode = Number(res.status) || 500;
    const statusTextValue = String(res.statusText || "Unknown");
    const errorMessage =
      `Admin API error [${statusCode} ${statusTextValue}]\n` +
      `  Method: ${method}\n` +
      `  URL: ${url}\n` +
      `  Response: ${errorText || "(empty response)"}`;

    // Log in development only
    if (process.env.NODE_ENV !== "production") {
      console.error("[adminApiFetch] Error:", errorMessage);
    }

    // Try to parse error text as JSON for better error message
    let parsedMessage = `Admin API error ${statusCode}`;
    if (errorText) {
      try {
        const jsonData = JSON.parse(errorText);
        if (jsonData && typeof jsonData === "object") {
          parsedMessage = String(jsonData.error || jsonData.message || parsedMessage);
        } else if (typeof jsonData === "string") {
          parsedMessage = jsonData;
        }
      } catch {
        // Not JSON, use the text as error message if it's not too long
        if (errorText.length < 200) {
          parsedMessage = errorText;
        }
      }
    }

    // Create error payload with explicit values
    const errorPayload: { status: number; statusText: string; message: string; path: string } = {
      status: statusCode,
      statusText: statusTextValue,
      message: parsedMessage,
      path: String(path || ""),
    };

    // Throw a plain object that's guaranteed to be serializable
    throw errorPayload;
  }

  // Parse response once and store it
  const data = (await res.json()) as T;

  // Log success in development only
  if (process.env.NODE_ENV !== "production") {
    const preview = Array.isArray(data)
      ? `Array(${data.length})`
      : data && typeof data === "object"
        ? `Object(${Object.keys(data).slice(0, 10).join(", ")})`
        : String(data);
    console.log("[adminApiFetch] OK", { method, url, preview });
  }

  return data;
}

/**
 * Fetch brand events from the admin API
 */
export async function getBrandEvents(brandId: string, page = 1, pageSize = 50) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  }).toString();

  return adminApiFetch<AdminEventListResponse>(`/brands/${brandId}/events?${query}`);
}
