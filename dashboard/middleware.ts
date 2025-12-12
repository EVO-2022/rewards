import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  console.log("[mw]", req.nextUrl.pathname, "->", req.nextUrl.href);

  const { userId } = await auth();

  // If user is not authenticated and trying to access protected routes
  if (!userId && isProtectedRoute(req)) {
    const redirectUrl = new URL("/sign-in", req.url);
    console.log("[mw redirect]", req.nextUrl.pathname, "to", redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (userId && (req.nextUrl.pathname === "/sign-in" || req.nextUrl.pathname === "/sign-up")) {
    const redirectUrl = new URL("/dashboard", req.url);
    console.log("[mw redirect]", req.nextUrl.pathname, "to", redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, protect everything else
    "/((?!_next|.*\\..*).*)",
  ],
};
