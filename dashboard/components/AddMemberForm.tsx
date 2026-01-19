"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AddMemberFormProps {
  brandId: string;
}

export function AddMemberForm({ brandId }: AddMemberFormProps) {
  const router = useRouter();
  const [clerkId, setClerkId] = useState("");
  const [role, setRole] = useState<"VIEWER" | "MANAGER" | "OWNER">("VIEWER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: clerkId.trim(),
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add member");
      }

      setMessage({
        type: "success",
        text: `Successfully added member with role ${role}`,
      });
      setClerkId("");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to add member",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
      <h3 className="text-lg font-medium text-gray-100 mb-4">Add Member</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="clerkId" className="block text-sm font-medium text-gray-300 mb-1">
            Clerk User ID
          </label>
          <input
            type="text"
            id="clerkId"
            value={clerkId}
            onChange={(e) => setClerkId(e.target.value)}
            placeholder="user_xxxxx"
            required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400">
            Enter the Clerk User ID (e.g., user_38S564F3iNJSI6WHbVe8cLrUjaI)
          </p>
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "VIEWER" | "MANAGER" | "OWNER")}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="VIEWER">VIEWER - Read-only access, can use portal</option>
            <option value="MANAGER">MANAGER - Can issue points, manage redemptions</option>
            <option value="OWNER">OWNER - Full access, can delete brand</option>
          </select>
        </div>
        {message && (
          <div
            className={`p-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-900/30 text-green-300 border border-green-700"
                : "bg-red-900/30 text-red-300 border border-red-700"
            }`}
          >
            {message.text}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !clerkId.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Adding..." : "Add Member"}
        </button>
      </form>
    </div>
  );
}
