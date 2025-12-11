import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";

// Force dynamic rendering since we use auth() which requires headers()
export const dynamic = "force-dynamic";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/members", label: "Members" },
  { href: "/dashboard/redemptions", label: "Redemptions" },
  { href: "/dashboard/api-keys", label: "API Keys" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/developers", label: "Developers" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let userId: string | null = null;

  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch (error: unknown) {
    // Safely handle auth errors - convert to string to avoid serialization issues
    // Never pass the error object itself, only convert to string for logging
    let errorMsg = "Authentication error";
    if (error) {
      if (typeof error === "object" && error !== null) {
        if ("message" in error && typeof error.message === "string") {
          errorMsg = error.message;
        } else if ("toString" in error && typeof error.toString === "function") {
          errorMsg = error.toString();
        }
      } else {
        errorMsg = String(error);
      }
    }
    // Log auth errors in development only
    if (process.env.NODE_ENV === "development") {
      console.warn("Auth error in layout:", errorMsg);
    }
    // Redirect to sign-in on auth failure
    redirect("/sign-in");
  }

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6">Dashboard</h2>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "block px-4 py-2 rounded-lg transition-colors",
                  "hover:bg-gray-800"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
