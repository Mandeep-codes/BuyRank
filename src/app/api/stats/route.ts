import { NextResponse } from "next/server";
import { getStats } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[stats]", error);
    return NextResponse.json(
      { totalCents: 0, listings: 0, bidCount: 0, topCents: 0 },
      { status: 200 },
    );
  }
}
