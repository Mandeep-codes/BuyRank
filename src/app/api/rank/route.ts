import { NextResponse } from "next/server";
import { findEntryRankByName } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rank lookup by display name. The success page polls this right after
 * checkout, because the webhook that settles the bid can land a few seconds
 * after the buyer is redirected back.
 */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("u")?.trim();
  if (!name || name.length > 200) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  try {
    const entry = await findEntryRankByName(name);
    if (!entry) {
      return NextResponse.json(
        { found: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        found: true,
        id: entry.id,
        rank: entry.rank,
        bidCents: entry.bidCents,
        displayName: entry.displayName,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[rank]", error);
    return NextResponse.json({ found: false }, { status: 200 });
  }
}
