"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side component that redirects VIEWER users to portal
 * This is a fallback in case server-side redirect doesn't work
 */
export function ViewerRedirect() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkRole() {
      try {
        const response = await fetch("/api/brands/mine", {
          cache: "no-store",
        });

        if (response.ok) {
          const brands = await response.json();
          const userBrands = Array.isArray(brands) ? brands : [];
          const hasAdminRole = userBrands.some(
            (b: any) => b.role === "OWNER" || b.role === "MANAGER"
          );

          // If user is VIEWER, redirect to portal IMMEDIATELY
          if (userBrands.length > 0 && !hasAdminRole) {
            // Use window.location for immediate redirect (no React router delay)
            window.location.href = "/portal";
            return;
          }
        }
      } catch (error) {
        // Silently fail - server-side redirect should handle it
        console.error("Error checking role in ViewerRedirect:", error);
      } finally {
        setIsChecking(false);
      }
    }

    // Run immediately, don't wait for React hydration
    checkRole();
  }, [router]);

  // Show nothing while checking (prevents dashboard flash)
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-gray-300">Loading...</div>
      </div>
    );
  }

  return null;
}
