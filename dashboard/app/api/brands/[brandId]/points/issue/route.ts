import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const REWARDS_API_URL = process.env.NEXT_PUBLIC_REWARDS_API_URL || "http://localhost:3000/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await params; // brandId is available but backend extracts from token

    // Validate required fields
    if (!body.externalUserId || !body.points) {
      return NextResponse.json(
        { error: "externalUserId and points are required" },
        { status: 400 }
      );
    }

    if (typeof body.points !== "number" || body.points < 1) {
      return NextResponse.json({ error: "points must be a positive number" }, { status: 400 });
    }

    // Forward request to Rewards API
    const response = await fetch(`${REWARDS_API_URL}/integration/points/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        externalUserId: body.externalUserId,
        points: body.points,
        reason: body.reason,
        // Note: backend may extract brandId from token, but include it if needed
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || "Failed to issue points" };
      }
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Issue points error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
