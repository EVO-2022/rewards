"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side component that redirects VIEWER users to portal
 * This is a fallback in case server-side redirect doesn't work
 */
export function ViewerRedirect() {
  const router = useRouter();

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

          // If user is VIEWER, redirect to portal
          if (userBrands.length > 0 && !hasAdminRole) {
            router.replace("/portal");
          }
        }
      } catch (error) {
        // Silently fail - server-side redirect should handle it
        console.error("Error checking role in ViewerRedirect:", error);
      }
    }

    checkRole();
  }, [router]);

  return null;
}
