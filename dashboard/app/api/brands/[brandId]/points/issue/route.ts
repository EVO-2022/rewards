import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { adminApiFetch } from "@/lib/server/rewardsApi";

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
    const { brandId } = await params;

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

    // Call brand route with externalUserId (backend will resolve it)
    const data = await adminApiFetch<{ id: string; ok: boolean }>(
      `/brands/${brandId}/points/issue`,
      {
        method: "POST",
        body: JSON.stringify({
          externalUserId: body.externalUserId,
          amount: body.points,
          reason: body.reason,
          metadata: body.metadata,
        }),
      }
    );

    // Revalidate ledger and points pages
    revalidatePath("/dashboard/ledger");
    revalidatePath("/dashboard/points");

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
