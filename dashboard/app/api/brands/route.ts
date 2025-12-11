import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const REWARDS_API_URL = process.env.NEXT_PUBLIC_REWARDS_API_URL || "http://localhost:3000/api";

export async function POST(request: NextRequest) {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${REWARDS_API_URL}/brands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to create brand" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Create brand error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
