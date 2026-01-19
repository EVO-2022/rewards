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

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  // The dashboard page will handle VIEWER redirect to portal
  if (userId && (req.nextUrl.pathname === "/sign-in" || req.nextUrl.pathname === "/sign-up")) {
    const redirectUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Let dashboard page handle VIEWER redirect (server-side + client-side fallback)
  // No need to check role in middleware - it's handled in the page component

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, protect everything else
    "/((?!_next|.*\\..*).*)",
  ],
};
