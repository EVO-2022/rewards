import type { Metadata } from "next";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rewards Admin",
  description: "Admin dashboard for the Rewards platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <Link href="/" className="text-xl font-semibold text-gray-900">
                    Rewards Admin
                  </Link>
                  <div className="flex items-center gap-4">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </div>
              </div>
            </nav>
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}

