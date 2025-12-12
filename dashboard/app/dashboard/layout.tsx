"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/members", label: "Members" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/redemptions", label: "Redemptions" },
  { href: "/dashboard/ledger", label: "Ledger" },
  { href: "/dashboard/points", label: "Issue Points" },
  { href: "/dashboard/developers", label: "Developers" },
  { href: "/dashboard/api-keys", label: "API Keys" },
];

function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="px-4 py-3 border-b border-slate-800">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Rewards Admin</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 py-3 text-sm">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 transition-colors ${
                active
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-300 hover:bg-slate-900 hover:text-slate-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
