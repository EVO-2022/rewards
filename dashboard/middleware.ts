import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, protect everything else
    "/((?!_next|.*\\..*).*)",
  ],
};

