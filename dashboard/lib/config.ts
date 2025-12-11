/**
 * Configuration for the Rewards Dashboard
 */

export const REWARDS_API_URL =
  process.env.NEXT_PUBLIC_REWARDS_API_URL || "http://localhost:3000/api";

if (!process.env.NEXT_PUBLIC_REWARDS_API_URL) {
  console.warn(
    "⚠️ NEXT_PUBLIC_REWARDS_API_URL not set, using default: http://localhost:3000/api"
  );
}

