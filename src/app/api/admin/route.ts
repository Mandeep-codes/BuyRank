import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { normalizeSubmission } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Moderation, deliberately unglamorous. Scam and malware listings need to come
 * off the board in seconds, and a curl command beats building an admin UI you'd
 * use twice a week.
 *
 *   curl -X POST https://yoursite.com/api/admin \
 *     -H "Authorization: Bearer $ADMIN_TOKEN" \
 *     -H "Content-Type: application/json" \
 *     -d '{"action":"hide","url":"scam.example"}'
 *
 * Hiding keeps the payment history — you'll want it if they open a dispute.
 */
export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token === "change-me") {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    url?: string;
  };

  const check = normalizeSubmission(body.url ?? "");
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const status =
    body.action === "hide" ? "hidden" : body.action === "restore" ? "active" : null;

  if (!status) {
    return NextResponse.json(
      { error: "action must be 'hide' or 'restore'." },
      { status: 400 },
    );
  }

  const updated = await db
    .update(entries)
    .set({ status, updatedAt: new Date() })
    .where(eq(entries.url, check.url))
    .returning({ id: entries.id, displayName: entries.displayName });

  if (!updated.length) {
    return NextResponse.json({ error: "No such listing." }, { status: 404 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, status, entry: updated[0] });
}
