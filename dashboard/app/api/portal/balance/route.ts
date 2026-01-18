import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { adminApiFetch } from "@/lib/server/rewardsApi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authData = await auth();
    if (!authData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ error: "Brand ID is required" }, { status: 400 });
    }

    // Call backend portal balance endpoint
    const data = await adminApiFetch<{ balance: number; userId: string; brandId: string }>(
      `/portal/${brandId}/balance`,
      { method: "GET" }
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
