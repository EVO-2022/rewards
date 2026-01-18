import type { Metadata } from "next";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rewards Admin",
  description: "Admin dashboard for the Rewards platform",
  icons: {
    icon: "/icon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-gray-900 text-gray-100">
          <div className="min-h-screen bg-gray-900">
            <nav className="bg-gray-800 border-b border-gray-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <Link href="/" className="flex items-center gap-3">
                    <Image
                      src="/logo.png"
                      alt="Logo"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="text-xl font-medium text-gray-100">Rewards Admin</span>
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
