"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Overview", href: "/dashboard" },
  { name: "Points", href: "/dashboard/points" },
  { name: "Ledger", href: "/dashboard/ledger" },
  { name: "Redemptions", href: "/dashboard/redemptions" },
  { name: "Members", href: "/dashboard/members" },
  { name: "Events", href: "/dashboard/events" },
  { name: "API Keys", href: "/dashboard/api-keys" },
  { name: "Developers", href: "/dashboard/developers" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-16">
      <div className="flex-1 flex flex-col min-h-0 bg-gray-800 border-r border-gray-700">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? "bg-gray-700 text-gray-100"
                      : "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                  } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
