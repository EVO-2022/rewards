import crypto from "crypto";

/**
 * Generate a new API key
 * Returns both the raw key (to show once) and its hash (to store)
 */
export function generateApiKey(): { rawKey: string; hash: string } {
  // Generate a random key: rk_ prefix + 32 bytes of random data in base64
  const randomBytes = crypto.randomBytes(32);
  const rawKey = `rk_${randomBytes.toString("base64url")}`;
  const hash = hashApiKey(rawKey);
  
  return { rawKey, hash };
}

/**
 * Hash an API key using SHA-256
 * This is a one-way hash - the raw key cannot be recovered
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Verify an API key against a stored hash
 */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const computedHash = hashApiKey(rawKey);
  return computedHash === storedHash;
}

