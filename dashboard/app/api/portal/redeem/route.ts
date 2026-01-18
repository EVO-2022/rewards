import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { adminApiFetch } from "@/lib/server/rewardsApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authData = await auth();
    if (!authData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, pointsUsed, metadata } = body;

    if (!brandId || !pointsUsed) {
      return NextResponse.json({ error: "brandId and pointsUsed are required" }, { status: 400 });
    }

    if (typeof pointsUsed !== "number" || pointsUsed < 1) {
      return NextResponse.json(
        { error: "pointsUsed must be a positive number" },
        { status: 400 }
      );
    }

    // Call portal redeem endpoint - backend derives userId from req.auth.userId
    // Client only sends: brandId, pointsUsed, metadata (NO userId)
    const redemption = await adminApiFetch<any>(`/portal/${brandId}/redeem`, {
      method: "POST",
      body: JSON.stringify({
        pointsUsed,
        metadata: metadata || {},
      }),
    });

    // Revalidate portal pages
    revalidatePath("/portal");
    revalidatePath("/portal/redeem");

    return NextResponse.json(redemption, { status: 201 });
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
