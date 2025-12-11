import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Rewards Admin Dashboard</h1>
        <p className="text-lg text-gray-600 mb-8">
          Manage your rewards program, members, and API keys
        </p>

        <SignedOut>
          <div className="space-y-4">
            <p className="text-gray-500">Please sign in to access the dashboard</p>
            <SignInButton mode="modal">
              <button
                type="button"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </SignedIn>
      </div>
    </div>
  );
}
