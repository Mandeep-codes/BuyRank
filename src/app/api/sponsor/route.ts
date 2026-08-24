import { NextResponse } from "next/server";
import { cachedSponsors } from "@/lib/cache";

export const runtime = "nodejs";

/** Shared per 30s window, same reasoning as /api/activity. */
export const revalidate = 30;

export async function GET() {
  try {
    const tiers = await cachedSponsors();
    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("[sponsor]", error);
    const empty = { current: null, nextOpenAt: new Date().toISOString() };
    return NextResponse.json({
      tiers: { premium: empty, plus: empty, standard: empty },
    });
  }
}
