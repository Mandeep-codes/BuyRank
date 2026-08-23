import { NextResponse } from "next/server";
import { count, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { visitors } from "@/lib/db/schema";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A browser counts as "online" if it has checked in within this window. */
const ONLINE_WINDOW = "150 seconds";

/**
 * Heartbeat. The browser sends a random token it generated itself; we record
 * that the token was seen, then return the two counts.
 *
 * Rate limited per IP so nobody can inflate the total by posting a stream of
 * fresh tokens. It's a vanity number, but an obviously fake one is worse than
 * none at all.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`presence:${clientIp(req)}`, 6, 60_000);

  let id: string | null = null;
  if (limit.ok) {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    // Only accept the shape we hand out — a 32-char hex token.
    if (typeof body.id === "string" && /^[0-9a-f]{32}$/.test(body.id)) {
      id = body.id;
    }
  }

  try {
    if (id) {
      await db
        .insert(visitors)
        .values({ id })
        .onConflictDoUpdate({
          target: visitors.id,
          set: { lastSeen: new Date() },
        });
    }

    const [online, total] = await Promise.all([
      db
        .select({ n: count() })
        .from(visitors)
        .where(gt(visitors.lastSeen, sql`now() - interval '${sql.raw(ONLINE_WINDOW)}'`)),
      db.select({ n: count() }).from(visitors),
    ]);

    return NextResponse.json(
      { online: Number(online[0]?.n ?? 0), total: Number(total[0]?.n ?? 0) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[presence]", error);
    // A broken counter must never break the page.
    return NextResponse.json({ online: 0, total: 0 });
  }
}
