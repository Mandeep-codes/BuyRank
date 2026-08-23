import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Polled by the live tape every 20s. */
export async function GET() {
  try {
    const items = await getRecentActivity(12);
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[activity]", error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
