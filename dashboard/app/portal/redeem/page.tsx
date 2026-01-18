"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Hardcoded catalog for MVP
const CATALOG = [
  {
    id: "item-1",
    title: "Free Coffee",
    pointsCost: 50,
    description: "Redeem for a free coffee at any location",
  },
  {
    id: "item-2",
    title: "$10 Gift Card",
    pointsCost: 100,
    description: "Get a $10 gift card to use anywhere",
  },
  {
    id: "item-3",
    title: "Premium Upgrade",
    pointsCost: 200,
    description: "Upgrade to premium membership for one month",
  },
  {
    id: "item-4",
    title: "Free Shipping",
    pointsCost: 25,
    description: "Free shipping on your next order",
  },
  {
    id: "item-5",
    title: "20% Discount",
    pointsCost: 75,
    description: "20% off your next purchase",
  },
];

function RedeemPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);

  async function fetchBalance(brandId: string) {
    try {
      const response = await fetch(`/api/portal/balance?brandId=${brandId}`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem(item: (typeof CATALOG)[0]) {
    if (!brandId) {
      setMessage({ type: "error", text: "Brand ID not found" });
      return;
    }

    if (balance === null || balance < item.pointsCost) {
      setMessage({ type: "error", text: "Insufficient balance" });
      return;
    }

    setRedeeming(item.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/portal/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          pointsUsed: item.pointsCost,
          metadata: {
            catalogItemId: item.id,
            title: item.title,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to redeem. Please try again.",
        });
        setRedeeming(null);
        return;
      }

      // Success - update balance and show confirmation
      const newBalance = (balance || 0) - item.pointsCost;
      setBalance(newBalance);
      setMessage({
        type: "success",
        text: `Successfully redeemed ${item.pointsCost} points for "${item.title}"!`,
      });
      setRedeeming(null);

      // Refresh after 2 seconds
      setTimeout(() => {
        router.push("/portal");
        router.refresh();
      }, 2000);
    } catch {
      setMessage({
        type: "error",
        text: "An error occurred. Please try again.",
      });
      setRedeeming(null);
    }
  }

  useEffect(() => {
    // Get brandId from URL param or determine it
    const brandIdParam = searchParams.get("brandId");
    if (brandIdParam) {
      setBrandId(brandIdParam);
      fetchBalance(brandIdParam);
    } else {
      // Try to get from env or fetch first brand
      const envBrandId = process.env.NEXT_PUBLIC_BRAND_ID;
      if (envBrandId) {
        setBrandId(envBrandId);
        fetchBalance(envBrandId);
      } else {
        // Fetch first brand
        fetch("/api/brands")
          .then((res) => res.json())
          .then((brands) => {
            if (brands && brands.length > 0) {
              const firstBrand = brands[0];
              setBrandId(firstBrand.id);
              fetchBalance(firstBrand.id);
            } else {
              setLoading(false);
            }
          })
          .catch(() => setLoading(false));
      }
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!brandId) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-medium mb-4">Redeem Points</h1>
          <p className="text-gray-300">No brand found. Please contact support.</p>
          <Link href="/portal" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/portal" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Portal
          </Link>
          <h1 className="text-2xl font-medium mb-2">Redeem Points</h1>
          {balance !== null && (
            <p className="text-gray-300">
              Your balance: <span className="font-medium">{balance} points</span>
            </p>
          )}
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-900/30 text-green-300 border border-green-700"
                : "bg-red-900/30 text-red-300 border border-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATALOG.map((item) => {
            const canAfford = balance !== null && balance >= item.pointsCost;
            const isRedeeming = redeeming === item.id;

            return (
              <div key={item.id} className="bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-medium mb-2">{item.title}</h3>
                <p className="text-gray-300 mb-4">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-blue-600">{item.pointsCost} points</span>
                  <button
                    onClick={() => handleRedeem(item)}
                    disabled={!canAfford || isRedeeming}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      canAfford && !isRedeeming
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {isRedeeming ? "Redeeming..." : "Redeem"}
                  </button>
                </div>
                {!canAfford && balance !== null && (
                  <p className="text-sm text-red-600 mt-2">
                    Need {item.pointsCost - balance} more points
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function RedeemPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 p-8">
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-300">Loading...</p>
          </div>
        </div>
      }
    >
      <RedeemPageContent />
    </Suspense>
  );
}
