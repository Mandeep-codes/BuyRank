import { NextResponse } from "next/server";
import { cachedActivity } from "@/lib/cache";

export const runtime = "nodejs";

/**
 * Cached at the edge for 20 seconds. Every visitor polling this used to mean
 * one database query each; now they all share one response per window, and the
 * payment webhook's revalidatePath busts it the moment a real bid lands.
 */
export const revalidate = 20;

export async function GET() {
  try {
    const items = await cachedActivity();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[activity]", error);
    return NextResponse.json({ items: [] });
  }
}
