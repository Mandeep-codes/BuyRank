import { NextResponse } from "next/server";
import { cachedSponsor } from "@/lib/cache";

export const runtime = "nodejs";

/** Shared per 30s window, same reasoning as /api/activity. */
export const revalidate = 30;

export async function GET() {
  try {
    const state = await cachedSponsor();
    return NextResponse.json(state);
  } catch (error) {
    console.error("[sponsor]", error);
    return NextResponse.json({
      current: null,
      nextOpenAt: new Date().toISOString(),
    });
  }
}
