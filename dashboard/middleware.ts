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

          // Redirect VIEWER users to /home, admin users to /dashboard
          const redirectPath = hasAdminRole ? "/dashboard" : "/home";
          const redirectUrl = new URL(redirectPath, req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    } catch (error) {
      // If API call fails, default to /home (safer for customers)
      console.error("Error checking user role in middleware:", error);
    }
    
    // Fallback: redirect to /home (customer-friendly default)
    const redirectUrl = new URL("/home", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If VIEWER user tries to access dashboard, redirect to /home
  if (userId && isDashboardRoute(req)) {
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

          // If user is VIEWER, redirect to /home
          if (!hasAdminRole) {
            const redirectUrl = new URL("/home", req.url);
            return NextResponse.redirect(redirectUrl);
          }
        }
      }
    } catch (error) {
      // If API call fails, let it through (layout will handle it)
      console.error("Error checking user role in middleware:", error);
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
