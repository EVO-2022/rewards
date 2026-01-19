import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { adminApiFetch } from "@/lib/server/rewardsApi";
import { Brand } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brands = await adminApiFetch<Brand[]>("/brands/mine", { method: "GET" });
    return NextResponse.json(brands);
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
