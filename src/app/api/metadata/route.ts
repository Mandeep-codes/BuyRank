import { NextResponse } from "next/server";
import { getEntryByUrl, priceToBeat } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { normalizeSubmission } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called as the person types a URL, so the form can show them what the link
 * resolves to and whether it's already on the board.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`meta:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Slow down." }, { status: 429 });
  }

  const { submission } = (await req.json().catch(() => ({}))) as {
    submission?: string;
  };

  const check = normalizeSubmission(submission ?? "");
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  const existing = await getEntryByUrl(check.url);

  return NextResponse.json({
    url: check.url,
    displayName: check.displayName,
    onBoard: Boolean(existing && existing.bidCents > 0),
    currentBidCents: existing?.bidCents ?? 0,
    minimumCents: existing ? priceToBeat(existing.bidCents) : 100,
  });
}
