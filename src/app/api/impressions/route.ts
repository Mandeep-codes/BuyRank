import { NextResponse } from "next/server";
import { PAGE_SIZE } from "@/lib/config";
import { recordImpressions } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Records that a board was actually rendered in front of somebody.
 *
 * This exists because the honest traffic number for a young listing is small,
 * and the fix for that is to count something real that is genuinely larger —
 * how often a listing was shown — rather than to start the counter above zero.
 * A seeded number is a claim to bidders about what their money bought, and it
 * stops being defensible the moment anyone compares it to their own analytics.
 *
 * Rate limited per IP, and the browser only reports a given board once per
 * session, so a refresh loop cannot run the number up.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`views:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: true });

  try {
    const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
    if (!Array.isArray(body.ids)) return NextResponse.json({ ok: true });

    const ids = Array.from(
      new Set(
        body.ids.filter(
          (id): id is string => typeof id === "string" && UUID.test(id),
        ),
      ),
    ).slice(0, PAGE_SIZE);

    await recordImpressions(ids);
  } catch (error) {
    console.error("[impressions]", error);
    // A broken counter must never break the page.
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
