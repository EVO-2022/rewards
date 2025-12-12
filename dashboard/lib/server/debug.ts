/**
 * Debug logging helper
 * Only logs when DEBUG_REWARDS=1 environment variable is set
 */
const DEBUG = process.env.DEBUG_REWARDS === "1";

export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    console.log(...args);
  }
}

export function debugError(...args: unknown[]): void {
  if (DEBUG) {
    console.error(...args);
  }
}

export function debugWarn(...args: unknown[]): void {
  if (DEBUG) {
    console.warn(...args);
  }
}
