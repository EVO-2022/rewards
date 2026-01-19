import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { adminApiFetch } from "@/lib/server/rewardsApi";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const authData = await auth();
    if (!authData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId } = params;
    const body = await request.json();
    const { clerkId, role } = body;

    if (!clerkId || !role) {
      return NextResponse.json(
        { error: "clerkId and role are required" },
        { status: 400 }
      );
    }

    // Call backend to add member
    const member = await adminApiFetch<any>(`/brands/${brandId}/members`, {
      method: "POST",
      body: JSON.stringify({
        clerkId,
        role,
      }),
    });

    // Revalidate members page
    revalidatePath("/dashboard/members");

    return NextResponse.json(member, { status: 201 });
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
