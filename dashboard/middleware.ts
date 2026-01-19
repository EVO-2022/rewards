import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId } = await auth();

  // If user is not authenticated and trying to access protected routes
  if (!userId && isProtectedRoute(req)) {
    const redirectUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and trying to access auth pages, check role and redirect appropriately
  if (userId && (req.nextUrl.pathname === "/sign-in" || req.nextUrl.pathname === "/sign-up")) {
    // Check user's role by calling the API
    try {
      const { getToken } = await auth();
      const token = await getToken();
      
      if (token) {
        const apiUrl = process.env.NEXT_PUBLIC_REWARDS_API_URL || "http://localhost:3000/api";
        const response = await fetch(`${apiUrl}/brands/mine`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (response.ok) {
          const brands = await response.json();
          const userBrands = Array.isArray(brands) ? brands : [];
          const hasAdminRole = userBrands.some((b: any) => 
            b.role === "OWNER" || b.role === "MANAGER"
          );

          // Redirect VIEWER users to portal, others to dashboard
          const redirectPath = hasAdminRole ? "/dashboard" : "/portal";
          const redirectUrl = new URL(redirectPath, req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    } catch (error) {
      // If API call fails, default to dashboard (will redirect from there if needed)
      console.error("Error checking user role in middleware:", error);
    }
    
    // Fallback: redirect to dashboard (page will handle VIEWER redirect)
    const redirectUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If VIEWER user tries to access dashboard, redirect to portal
  if (userId && isDashboardRoute(req)) {
    try {
      const { getToken } = await auth();
      const token = await getToken();
      
      if (token) {
        const apiUrl = process.env.NEXT_PUBLIC_REWARDS_API_URL || "http://localhost:3000/api";
        
        // Make API call with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        try {
          const response = await fetch(`${apiUrl}/brands/mine`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const brands = await response.json();
            const userBrands = Array.isArray(brands) ? brands : [];
            const hasAdminRole = userBrands.some((b: any) => 
              b.role === "OWNER" || b.role === "MANAGER"
            );

            // If user is VIEWER, redirect to portal
            if (!hasAdminRole && userBrands.length > 0) {
              const redirectUrl = new URL("/portal", req.url);
              return NextResponse.redirect(redirectUrl);
            }
          } else {
            // If API call fails, let the request through (page will handle it)
            console.warn(`[middleware] API call failed: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.warn("[middleware] API call timed out, letting page handle redirect");
          } else {
            console.error("[middleware] API call error:", fetchError.message);
          }
        }
      } else {
        console.warn("[middleware] No token available, letting page handle redirect");
      }
    } catch (error) {
      // If API call fails, let the request through (page will handle it)
      console.error("[middleware] Error checking user role:", error);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, protect everything else
    "/((?!_next|.*\\..*).*)",
  ],
};
