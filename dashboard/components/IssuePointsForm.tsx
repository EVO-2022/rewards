"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./Card";

interface IssuePointsFormProps {
  brandId: string;
  brandName: string;
}

export function IssuePointsForm({ brandId }: IssuePointsFormProps) {
  const router = useRouter();
  const [externalUserId, setExternalUserId] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/points/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalUserId,
          points: parseInt(points, 10),
          reason: reason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to issue points");
      }

      setMessage({
        type: "success",
        text: `Successfully issued ${points} points to ${externalUserId}`,
      });
      setExternalUserId("");
      setPoints("");
      setReason("");
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to issue points",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="externalUserId" className="block text-sm font-medium text-gray-700 mb-2">
            External User ID *
          </label>
          <input
            id="externalUserId"
            type="text"
            value={externalUserId}
            onChange={(e) => setExternalUserId(e.target.value)}
            placeholder="e.g., user-123"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            The user identifier from your system (not the internal user ID)
          </p>
        </div>

        <div>
          <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-2">
            Points *
          </label>
          <input
            id="points"
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="e.g., 100"
            required
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason (optional)
          </label>
          <input
            id="reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Purchase reward, Referral bonus"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !externalUserId || !points}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Issuing..." : "Issue Points"}
        </button>
      </form>
    </Card>
  );
}
