#!/usr/bin/env python3
# BuyRank redesign - sub-pages, OG images, favicon, badge
# Run from the repo root. Idempotent: re-running prints "same" and writes nothing.
import os, sys

if not os.path.isdir("src/app"):
    sys.exit("run this from the repo root (the folder holding package.json)")

FILES = {}
DELETE = []

FILES['src/app/about/page.tsx'] = r"""import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "About",
  description: `What ${SITE_NAME} is and why it exists.`,
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <h1 className="mt-10 text-[44px] font-bold leading-none tracking-[-0.02em]">
        About
      </h1>
      <p className="mt-5 max-w-lg text-[19px] font-semibold leading-snug tracking-[-0.01em] text-dim">
        A directory that tells you the truth about how it ranks things.
      </p>

      <div className="mt-10 space-y-5 pt-8 text-[14px] leading-relaxed text-dim">
        <p>
          Every directory claims its ranking is earned. Upvotes, launch days,
          editorial curation, mysterious relevance scores. Underneath most of
          them, the top spots still go to whoever spent the most — on ads, on
          agencies, on getting their launch coordinated.
        </p>
        <p>
          <span className="font-semibold text-ink">{SITE_NAME}</span> removes
          the pretense. The ranking is the price. Pay more than the listing
          above you and you take its place. That is the whole mechanism, and it
          is printed on every row: the price is set in type as big as the money
          it represents, so the shape of the board is the shape of the market.
        </p>
        <p>
          What you get is a link, a description pulled from your own page, and a
          click counter so you can see exactly what the money bought. What you
          don&apos;t get is your money back when the next person outbids you.
        </p>
        <p>
          There are no dates anywhere on the board on purpose. How long
          something has been listed tells you nothing about where it deserves to
          sit. Only the number does.
        </p>
        <p>
          It is a leaderboard, an ad slot, and a small joke about how attention
          is priced, all at once. Everyone bidding knows this.
        </p>
        <p>
          Questions, removals, or a payment that went sideways:{""}
          <Link
            href="/rules"
            className="text-accent underline underline-offset-4"
          >
            read the rules
          </Link>
          {""}
          first, then get in touch.
        </p>
      </div>
    </main>
  );
}
"""

FILES['src/app/api/activity/route.ts'] = r"""import { NextResponse } from "next/server";
import { cachedActivity, cachedClicks } from "@/lib/cache";

export const runtime = "nodejs";

/**
 * Cached at the edge for 20 seconds. Every visitor polling this used to mean
 * one database query each; now they all share one response per window, and the
 * payment webhook's revalidatePath busts it the moment a real bid lands.
 */
export const revalidate = 20;

export async function GET() {
  try {
    const [items, clicks] = await Promise.all([
      cachedActivity(),
      cachedClicks(),
    ]);
    return NextResponse.json({ items, clicks });
  } catch (error) {
    console.error("[activity]", error);
    return NextResponse.json({ items: [], clicks: [] });
  }
}
"""

FILES['src/app/api/admin/route.ts'] = r"""import { revalidatePath } from "next/cache";
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
    body.action === "hide"
      ? "hidden"
      : body.action === "restore"
        ? "active"
        : null;

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
"""

FILES['src/app/api/badge/[id]/route.ts'] = r"""import { SITE_NAME } from "@/lib/config";
import { getEntryWithRank } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function svg(label: string, active: boolean): string {
  const width = 36 + label.length * 8.4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="44" role="img" aria-label="${label}">
  <rect width="100%" height="100%" rx="12" fill="${active ? "rgb(17, 17, 17)" : "rgb(140, 140, 140)"}"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="-apple-system,'Segoe UI',Roboto,sans-serif" font-size="15" font-weight="700" fill="rgb(255, 255, 255)">${label}</text>
</svg>`;
}

/**
 * The embeddable rank badge. Live: the rank in the image moves with the
 * board, which is the whole point of embedding it — and a five-minute CDN
 * cache keeps hotlinks from becoming a database tap.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers = {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  };

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response(svg(`on ${SITE_NAME}`, false), { headers });
  }

  try {
    const entry = await getEntryWithRank(id);
    const label = entry ? `#${entry.rank} on ${SITE_NAME}` : `on ${SITE_NAME}`;
    return new Response(svg(label, Boolean(entry)), { headers });
  } catch (error) {
    console.error("[badge]", error);
    return new Response(svg(`on ${SITE_NAME}`, false), { headers });
  }
}
"""

FILES['src/app/api/checkout/route.ts'] = r"""import { NextResponse } from "next/server";
import {
  CATEGORY_SLUGS,
  MAX_BID_CENTS,
  MIN_BID_CENTS,
  SPONSOR_MAX_DAYS,
  sponsorTier,
} from "@/lib/config";
import { createCheckoutSession, paymentsConfigured } from "@/lib/dodo";
import { scrapeMetadata } from "@/lib/metadata";
import { getEntryByUrl } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { normalizeSubmission } from "@/lib/url";

export const runtime = "nodejs";
// The metadata scrape can take several seconds on slow targets.
export const maxDuration = 30;

type Body = {
  submission?: string;
  category?: string;
  bidDollars?: number | string;
  email?: string;
  /** "sponsor" rents a promoted card instead of bidding for rank. */
  kind?: string;
  days?: number | string;
  tier?: string;
};

export async function POST(req: Request) {
  // The site can be live before Dodo verification clears. Say so honestly
  // rather than letting the request die inside the payment call.
  if (!paymentsConfigured()) {
    return NextResponse.json(
      { error: "Bidding isn't open yet. Check back shortly." },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const limit = rateLimit(`checkout:${ip}`, 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter}s.` },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // --- Validate the link -------------------------------------------------
  const check = normalizeSubmission(body.submission ?? "");
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  // --- Sponsor rental ----------------------------------------------------
  // Price is derived here from the day count, never taken from the browser.
  if (body.kind === "sponsor") {
    const days = Math.floor(Number(body.days));
    if (!Number.isFinite(days) || days < 1 || days > SPONSOR_MAX_DAYS) {
      return NextResponse.json(
        { error: `Rentals run 1 to ${SPONSOR_MAX_DAYS} days.` },
        { status: 400 },
      );
    }

    const tier = sponsorTier(String(body.tier ?? "standard"));
    if (!tier) {
      return NextResponse.json(
        { error: "Unknown placement." },
        { status: 400 },
      );
    }

    const sponsorCents = days * tier.priceCentsPerDay;
    const meta = await scrapeMetadata(check.url);

    try {
      const session = await createCheckoutSession({
        amountCents: sponsorCents,
        email:
          typeof body.email === "string" && /^\S+@\S+\.\S+$/.test(body.email)
            ? body.email.trim()
            : undefined,
        successQuery: "sponsor=1",
        metadata: {
          kind: "sponsor",
          url: check.url,
          display_name: check.displayName,
          title: meta.title ?? "",
          description: meta.description ?? "",
          favicon_url: meta.faviconUrl ?? "",
          sponsor_days: String(days),
          sponsor_cents: String(sponsorCents),
          sponsor_tier: tier.id,
        },
      });
      return NextResponse.json({ checkoutUrl: session.checkoutUrl });
    } catch (error) {
      console.error("[checkout:sponsor]", error);
      return NextResponse.json(
        { error: "Couldn't start checkout. Try again in a moment." },
        { status: 502 },
      );
    }
  }

  // --- Validate the category --------------------------------------------
  const category =
    body.category && CATEGORY_SLUGS.includes(body.category)
      ? body.category
      : "other";

  // --- Validate the amount ----------------------------------------------
  // Never trust the price the browser sent. Re-derive the floor from the DB.
  const dollars = Math.floor(Number(body.bidDollars));
  if (!Number.isFinite(dollars) || dollars < 1) {
    return NextResponse.json(
      { error: "Bids are whole dollars, $1 minimum." },
      { status: 400 },
    );
  }

  const amountCents = dollars * 100;
  if (amountCents < MIN_BID_CENTS) {
    return NextResponse.json(
      { error: "The minimum bid is $1." },
      { status: 400 },
    );
  }
  if (amountCents > MAX_BID_CENTS) {
    return NextResponse.json(
      { error: `The maximum single bid is $${MAX_BID_CENTS / 100}.` },
      { status: 400 },
    );
  }

  const existing = await getEntryByUrl(check.url);
  if (existing && amountCents <= existing.bidCents) {
    return NextResponse.json(
      {
        error: `That link is already on the board at $${existing.bidCents / 100}. Bid more than that to move it up.`,
      },
      { status: 409 },
    );
  }
  if (existing?.status === "hidden") {
    return NextResponse.json(
      { error: "That link has been removed from the board." },
      { status: 403 },
    );
  }

  // --- Fill in the row's copy from the page itself -----------------------
  // Reuse whatever we already have so a re-bid doesn't refetch unnecessarily.
  const meta =
    existing?.title && existing?.description
      ? {
          title: existing.title,
          description: existing.description,
          faviconUrl: existing.faviconUrl,
        }
      : await scrapeMetadata(check.url);

  const email =
    typeof body.email === "string" && /^\S+@\S+\.\S+$/.test(body.email)
      ? body.email.trim()
      : undefined;

  try {
    const session = await createCheckoutSession({
      amountCents,
      email,
      successQuery: `u=${encodeURIComponent(check.displayName)}`,
      metadata: {
        url: check.url,
        display_name: check.displayName,
        category,
        bid_cents: String(amountCents),
        title: meta.title ?? "",
        description: meta.description ?? "",
        favicon_url: meta.faviconUrl ?? "",
      },
    });

    return NextResponse.json({ checkoutUrl: session.checkoutUrl });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: "Couldn't start checkout. Try again in a moment." },
      { status: 502 },
    );
  }
}
"""

FILES['src/app/api/metadata/route.ts'] = r"""import { NextResponse } from "next/server";
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
  if (!check.ok)
    return NextResponse.json({ error: check.reason }, { status: 400 });

  const existing = await getEntryByUrl(check.url);

  return NextResponse.json({
    url: check.url,
    displayName: check.displayName,
    onBoard: Boolean(existing && existing.bidCents > 0),
    currentBidCents: existing?.bidCents ?? 0,
    minimumCents: existing ? priceToBeat(existing.bidCents) : 100,
  });
}
"""

FILES['src/app/api/presence/route.ts'] = r"""import { NextResponse } from "next/server";
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
  // 60/min, not 6: whole apartment blocks and mobile carriers (CGNAT) share
  // one IP, and at 6/min the seventh person behind it stopped being counted —
  // the online number was *under*-reporting. The limit only needs to stop a
  // single script spraying fresh tokens, and 60/min still does that.
  const limit = rateLimit(`presence:${clientIp(req)}`, 60, 60_000);

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
        .where(
          gt(
            visitors.lastSeen,
            sql`now() - interval '${sql.raw(ONLINE_WINDOW)}'`,
          ),
        ),
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
"""

FILES['src/app/api/stats/route.ts'] = r"""import { NextResponse } from "next/server";
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
      {
        totalCents: 0,
        listings: 0,
        bidCount: 0,
        topCents: 0,
        totalClicks: 0,
        onlineNow: 0,
        totalVisitors: 0,
      },
      { status: 200 },
    );
  }
}
"""

FILES['src/app/api/webhooks/dodo/route.ts'] = r"""import { revalidatePath, revalidateTag } from "next/cache";
import { BOARD_TAG } from "@/lib/cache";
import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { CATEGORY_SLUGS, MIN_BID_CENTS, sponsorTier } from "@/lib/config";
import type { DodoWebhookPayload } from "@/lib/dodo";
import {
  reverseBid,
  reverseSponsor,
  settleBid,
  settleSponsor,
} from "@/lib/queries";
import { scrapeMetadata } from "@/lib/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * The only place a bid is ever written. Dodo retries until it gets a 2xx, so
 * every path here is safe to run twice — `settleBid` keys on `payment_id`.
 *
 * Note the two failure styles: a bad signature is a 400 (stop retrying, this
 * isn't us), while a database error is a 500 (please retry, we'll take it).
 */
export async function POST(req: Request) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] DODO_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
  };

  try {
    new Webhook(secret).verify(rawBody, headers);
  } catch {
    // Don't echo anything about why — an attacker probing signatures learns nothing.
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: DodoWebhookPayload;
  try {
    event = JSON.parse(rawBody) as DodoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  // A refund or a lost dispute has to come off the board, or someone keeps a
  // paid rank they were paid back for.
  //
  // These four strings are exact — they come from Dodo's published event list.
  // dispute.won is deliberately absent: winning means we keep the money, so the
  // listing keeps its rank. dispute.opened is also absent, because funds are
  // only held at that point and the seller may still win.
  //
  // The payload for refund.* and dispute.* is a Refund or Dispute object, both
  // of which carry payment_id — which is what settleBid keyed on.
  if (
    event.type === "refund.succeeded" ||
    event.type === "dispute.accepted" ||
    event.type === "dispute.lost"
  ) {
    const id = event.data?.payment_id;
    if (id) {
      try {
        const reversed = (await reverseBid(id)) || (await reverseSponsor(id));
        if (reversed) {
          revalidateTag(BOARD_TAG);
          revalidatePath("/", "layout");
        }
        return NextResponse.json({ received: true, reversed });
      } catch (error) {
        console.error("[webhook] reverse failed", error);
        return NextResponse.json({ error: "Reverse failed" }, { status: 500 });
      }
    }
    return NextResponse.json({ received: true });
  }

  // Anything other than a completed payment is acknowledged and ignored.
  if (event.type !== "payment.succeeded") {
    return NextResponse.json({ received: true });
  }

  const data = event.data ?? {};
  const meta = data.metadata ?? {};
  const paymentId = data.payment_id;

  if (!paymentId || !meta.url) {
    console.warn("[webhook] payment.succeeded without url metadata", paymentId);
    return NextResponse.json({ received: true });
  }

  // A sponsor rental settles into the slot queue, not onto the board.
  if (meta.kind === "sponsor") {
    const days = Number(meta.sponsor_days);
    const sponsorCents = Number(meta.sponsor_cents);
    if (!Number.isFinite(days) || days < 1 || !Number.isFinite(sponsorCents)) {
      console.warn("[webhook] implausible sponsor metadata", paymentId);
      return NextResponse.json({ received: true });
    }
    // Old checkout sessions predate tiers; they settle into "standard".
    const tier = sponsorTier(meta.sponsor_tier ?? "")?.id ?? "standard";

    try {
      const result = await settleSponsor({
        url: meta.url,
        displayName: meta.display_name || meta.url,
        title: meta.title || null,
        description: meta.description || null,
        faviconUrl: meta.favicon_url || null,
        days,
        amountCents: sponsorCents,
        paymentId,
        tier,
      });
      if (result.applied) {
        revalidateTag(BOARD_TAG);
        revalidatePath("/", "layout");
      }
      return NextResponse.json({ received: true, applied: result.applied });
    } catch (error) {
      console.error("[webhook] sponsor settle failed", error);
      return NextResponse.json({ error: "Settle failed" }, { status: 500 });
    }
  }

  // Trust our own metadata for the amount, not the charged total — the charged
  // total includes tax, and rank should reflect the bid, not the buyer's VAT.
  const amountCents = Number(meta.bid_cents);
  if (!Number.isFinite(amountCents) || amountCents < MIN_BID_CENTS) {
    console.warn("[webhook] implausible bid_cents", meta.bid_cents, paymentId);
    return NextResponse.json({ received: true });
  }

  const category = CATEGORY_SLUGS.includes(meta.category ?? "")
    ? meta.category
    : "other";

  // If the checkout-time scrape came back empty (target was slow, or briefly
  // behind a challenge page), try once more now — the listing is being paid
  // for and deserves its title, description, and icon.
  let title = meta.title || null;
  let description = meta.description || null;
  let faviconUrl = meta.favicon_url || null;
  if (!title || !description || !faviconUrl) {
    try {
      const fresh = await scrapeMetadata(meta.url);
      title = title || fresh.title;
      description = description || fresh.description;
      faviconUrl = faviconUrl || fresh.faviconUrl;
    } catch (error) {
      console.warn("[webhook] rescrape failed", error);
    }
  }

  try {
    const result = await settleBid({
      url: meta.url,
      displayName: meta.display_name || meta.url,
      title,
      description,
      faviconUrl,
      category: category!,
      amountCents,
      paymentId,
      email: data.customer?.email ?? null,
    });

    if (result.applied) {
      // Tag first: it is what the board actually reads from.
      revalidateTag(BOARD_TAG);
      revalidatePath("/", "layout");
    }

    return NextResponse.json({ received: true, applied: result.applied });
  } catch (error) {
    console.error("[webhook] settle failed", error);
    // 500 tells Dodo to retry — better than silently losing someone's money.
    return NextResponse.json({ error: "Settle failed" }, { status: 500 });
  }
}
"""

FILES['src/app/apple-icon.tsx'] = r"""import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS. Squircle, not a circle — iOS masks it itself. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgb(17, 17, 17)",
        color: "rgb(255, 255, 255)",
        fontSize: 118,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {SITE_NAME.charAt(0).toUpperCase()}
    </div>,
    size,
  );
}
"""

FILES['src/app/category/[slug]/page.tsx'] = r"""import { notFound } from "next/navigation";
import Link from "next/link";
import { CategoryPills } from "@/components/CategoryPills";
import { EntryRow } from "@/components/EntryRow";
import { Pagination } from "@/components/Pagination";
import { CATEGORIES, categoryLabel, SITE_NAME } from "@/lib/config";
import { cachedBoard, cachedCategories, cachedStats } from "@/lib/cache";

// Dynamic because of searchParams; the caching is in @/lib/cache.
export const maxDuration = 60;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const label = categoryLabel(slug);
  return {
    title: label,
    description: `Paid rankings for ${label} on ${SITE_NAME}.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;

  if (!CATEGORIES.some((c) => c.slug === slug)) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const [board, , available] = await Promise.all([
    cachedBoard(page, slug),
    cachedStats(),
    cachedCategories(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <div className="mt-10 pb-3">
        <h1 className="text-[34px] font-bold leading-none tracking-[-0.02em] sm:text-[42px]">
          {categoryLabel(slug)}
        </h1>
        <p className="mt-4 text-[10px] font-semibold tracking-[0.01em] text-dim">
          Positions are board-wide, not category-wide
        </p>
      </div>

      <div className="mt-5">
        <CategoryPills active={slug} available={available} />
      </div>

      {board.rows.length === 0 ? (
        <div className="card mt-6 px-6 py-20 text-center">
          <p className="text-[22px] font-bold tracking-[-0.02em]">
            Nothing listed here yet
          </p>
          <p className="mt-2 text-[14px] text-dim">
            <Link
              href="/#bid"
              className="text-accent underline underline-offset-4"
            >
              List the first one
            </Link>
            {""}
            for a dollar.
          </p>
        </div>
      ) : (
        <>
          <div className="sheet mt-6">
            <div className="sheet-head flex items-center gap-3 px-4 py-3 sm:gap-5 sm:px-5">
              <span className="label hidden w-7 shrink-0 sm:block">Step</span>
              <span className="label flex-1">Listing</span>
              <span className="label hidden w-40 shrink-0 lg:block">
                Category
              </span>
              <span className="label hidden w-24 shrink-0 md:block">
                Traffic
              </span>
              <span className="label w-16 shrink-0 text-right">Bid</span>
              <span className="w-[76px] shrink-0 sm:w-[110px]" aria-hidden />
            </div>
            <ol>
              {board.rows.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </ol>
          </div>
          <Pagination
            page={page}
            pages={board.pages}
            basePath={`/category/${slug}`}
          />
        </>
      )}
    </main>
  );
}
"""

FILES['src/app/icon.tsx'] = r"""import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";

export const runtime = "nodejs";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * Favicon. Same coin the masthead uses — orange disc, heavy dark ring, white
 * initial — so the tab matches the site. Drawn at 64px and downscaled by the
 * browser, which keeps the ring crisp at 16px.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgb(17, 17, 17)",
        color: "rgb(255, 255, 255)",
        border: "5px solid rgb(17, 17, 17)",
        borderRadius: "50%",
        fontSize: 40,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {SITE_NAME.charAt(0).toUpperCase()}
    </div>,
    size,
  );
}
"""

FILES['src/app/l/[id]/opengraph-image.tsx'] = r"""import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { getEntryWithRank, priceToBeat } from "@/lib/queries";

export const runtime = "nodejs";
export const alt = `Listing rank on ${SITE_NAME}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

/** The share card: rank huge, name under it, the takeover price as the dare. */
export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntryWithRank(id).catch(() => null);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "rgb(255, 255, 255)",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span
          style={{ fontSize: 30, fontWeight: 700, color: "rgb(17, 17, 17)" }}
        >
          {SITE_NAME}
        </span>
        <span style={{ fontSize: 26, color: "rgb(140, 140, 140)" }}>
          rank is bought, not earned
        </span>
      </div>

      {entry ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 200,
              fontWeight: 800,
              color: "rgb(17, 17, 17)",
              lineHeight: 1,
            }}
          >
            #{entry.rank}
          </span>
          <span
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: "rgb(17, 17, 17)",
              marginTop: 18,
            }}
          >
            {entry.displayName}
          </span>
        </div>
      ) : (
        <span
          style={{ fontSize: 64, fontWeight: 800, color: "rgb(17, 17, 17)" }}
        >
          This spot is open.
        </span>
      )}

      <span style={{ fontSize: 30, color: "rgb(140, 140, 140)" }}>
        {entry
          ? `Holding at ${formatUsd(entry.bidCents)} — take it for ${formatUsd(priceToBeat(entry.bidCents))}`
          : "New listings start at $1"}
      </span>
    </div>,
    size,
  );
}
"""

FILES['src/app/l/[id]/page.tsx'] = r"""import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyBox } from "@/components/CopyBox";
import { Favicon } from "@/components/Favicon";
import { ShareRow } from "@/components/ShareRow";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { formatCompact, formatUsd } from "@/lib/format";
import { getEntryWithRank, priceToBeat } from "@/lib/queries";

/** Ranks move; a minute of staleness is fine, a build-time snapshot is not. */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = await getEntryWithRank(id).catch(() => null);
  if (!entry) return { title: `Not listed — ${SITE_NAME}` };
  return {
    title: `${entry.displayName} — #${entry.rank} on ${SITE_NAME}`,
    description: `Holding #${entry.rank} at ${formatUsd(entry.bidCents)}. Outbid it and the spot is yours.`,
  };
}

/**
 * A listing's own page, laid out like the certificate for a position: the
 * amount paid, set large, and the three figures that follow from it. This is
 * what a bidder links when they want to show the rank they bought, and what
 * the OG card renders from.
 */
export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const entry = await getEntryWithRank(id).catch(() => null);
  if (!entry) notFound();

  const pageUrl = `${SITE_URL}/l/${entry.id}`;
  const takeFor = priceToBeat(entry.bidCents);
  const badgeSnippet = `<a href="${pageUrl}"><img src="${SITE_URL}/api/badge/${entry.id}" alt="#${entry.rank} on ${SITE_NAME}" height="44"></a>`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <p className="label mt-12">Position {entry.rank} · standing bid</p>
      <p
        className="denom mt-4 text-[clamp(3.4rem,13vw,6.5rem)]"
        style={{ "--lum": 1 } as React.CSSProperties}
      >
        {formatUsd(entry.bidCents)}
      </p>

      <div className="mt-8 flex items-start gap-3 pt-6">
        <Favicon
          src={entry.faviconUrl}
          url={entry.url}
          name={entry.displayName}
          size={40}
          className="h-11 w-11 shrink-0 rounded-[10px] bg-paper object-contain p-1.5"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em]">
            {entry.displayName}
          </h1>
          {entry.title ? (
            <p className="mt-0.5 text-[15px] text-dim">{entry.title}</p>
          ) : null}
        </div>
      </div>

      {entry.description ? (
        <p className="mt-5 text-[14px] leading-relaxed text-dim">
          {entry.description}
        </p>
      ) : null}

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-edge bg-wash bg-edge sm:grid-cols-3">
        <Stat label="Position" value={`#${entry.rank}`} />
        <Stat label="Costs to pass" value={formatUsd(takeFor)} />
        <Stat
          label="Clicks delivered"
          value={formatCompact(entry.clicks)}
          className="col-span-2 sm:col-span-1"
        />
      </dl>

      <div className="mt-7 flex flex-wrap items-center gap-2">
        <Link href={`/?amount=${takeFor / 100}#bid`} className="btn btn-ink">
          Take this spot for {formatUsd(takeFor)}
        </Link>
        <a
          href={`/r/${entry.id}`}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="btn btn-quiet"
        >
          Visit {entry.displayName}
        </a>
      </div>

      <section className="mt-14 pt-8">
        <p className="label">Share this position</p>
        <div className="mt-4">
          <ShareRow
            url={pageUrl}
            text={`${entry.displayName} is #${entry.rank} on ${SITE_NAME} — outbid it if you dare.`}
          />
        </div>
      </section>

      <section className="mt-10 pt-8">
        <p className="label">Embed the live badge</p>
        <p className="mt-2 text-[13px] leading-relaxed text-dim">
          The rank inside the badge updates as the board moves.
        </p>
        <div className="mt-4">
          <CopyBox value={badgeSnippet} />
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`bg-wash px-4 py-4 ${className}`}>
      <dt className="label">{label}</dt>
      <dd className="denom mt-2 text-[24px] text-accent">{value}</dd>
    </div>
  );
}
"""

FILES['src/app/not-found.tsx'] = r"""import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 sm:px-6">
      <p className="label">Not listed</p>
      <p
        className="denom mt-4 text-[clamp(3.4rem,13vw,6rem)]"
        style={{ "--lum": 1 } as React.CSSProperties}
      >
        404
      </p>
      <h1 className="mt-6 text-[24px] font-bold leading-tight tracking-[-0.02em]">
        Nothing here
      </h1>
      <p className="mt-4 max-w-md text-[14px] leading-relaxed text-dim">
        This page doesn&apos;t exist, or the listing came off the board.
      </p>
      <div className="mt-8">
        <Link href="/" className="btn btn-ink">
          Back to the board
        </Link>
      </div>
    </main>
  );
}
"""

FILES['src/app/opengraph-image.tsx'] = r"""import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { getPriceForFirst, getTopEntry } from "@/lib/queries";

export const runtime = "nodejs";
export const alt = `${SITE_NAME} — rank is bought, not earned`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Regenerated as the board moves, so a share always shows the live price of
 * #1 — which is the number that makes people click.
 */
export const revalidate = 300;

export default async function OgImage() {
  const [top, priceForFirst] = await Promise.all([
    getTopEntry().catch(() => null),
    getPriceForFirst().catch(() => 100),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "rgb(255, 255, 255)",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span
          style={{ fontSize: 30, fontWeight: 700, color: "rgb(17, 17, 17)" }}
        >
          {SITE_NAME}
        </span>
        <span style={{ fontSize: 26, color: "rgb(140, 140, 140)" }}>
          rank is bought, not earned
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "none",
            color: "rgb(140, 140, 140)",
          }}
        >
          #1 currently costs
        </span>
        <span
          style={{
            fontSize: 190,
            fontWeight: 800,
            color: "rgb(17, 17, 17)",
            lineHeight: 1,
            marginTop: 12,
          }}
        >
          {formatUsd(priceForFirst)}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          borderTop: "3px solid rgb(17, 17, 17)",
          paddingTop: 28,
          fontSize: 30,
          color: "rgb(140, 140, 140)",
        }}
      >
        {top ? (
          <>
            <span style={{ color: "rgb(17, 17, 17)", fontWeight: 700 }}>
              #1
            </span>
            <span style={{ color: "rgb(17, 17, 17)" }}>{top.displayName}</span>
            <span>holds it at {formatUsd(top.bidCents)}</span>
          </>
        ) : (
          <span>The board is empty. $1 takes the top spot.</span>
        )}
      </div>
    </div>,
    size,
  );
}
"""

FILES['src/app/privacy/page.tsx'] = r"""import { Clause, LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, POLICY_UPDATED, SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "Privacy Policy",
  description: `What ${SITE_NAME} collects, why, and how to have it deleted.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={POLICY_UPDATED}>
      <Clause heading="The short version">
        <p>
          We collect very little. We do not run advertising trackers, we do not
          set tracking cookies, and we do not sell or share your data with
          anyone for marketing.
        </p>
      </Clause>

      <Clause heading="What we collect">
        <p>
          <span className="text-ink">The link you submit</span>, along with the
          title, description and icon we read from that page. This is public by
          design — it is the listing.
        </p>
        <p>
          <span className="text-ink">Your email address</span>, only if you
          choose to enter one for a receipt. It is never displayed publicly and
          is used solely to contact you about your payment.
        </p>
        <p>
          <span className="text-ink">A payment reference</span> from our payment
          provider, so we can match a payment to a listing and handle refunds.
        </p>
        <p>
          <span className="text-ink">A click count</span> per listing. This is a
          single number per listing. We do not record who clicked, their IP
          address, or any profile of visitors.
        </p>
        <p>
          <span className="text-ink">A visitor count.</span> When you open the
          site your browser generates a random token, stores it locally, and
          sends it back so we can show how many people are reading right now. It
          is not derived from your IP address, your device, or anything about
          you, it is not shared, and clearing your browser storage discards it
          permanently.
        </p>
        <p>
          <span className="text-ink">Standard server logs</span> kept briefly by
          our hosting provider for security and reliability, which may include
          IP addresses.
        </p>
      </Clause>

      <Clause heading="Payment data">
        <p>
          We never see or store your card details. Payments are processed by
          Dodo Payments, which acts as the merchant of record and handles your
          payment information under its own privacy policy.
        </p>
      </Clause>

      <Clause heading="Who processes data for us">
        <p>
          — <span className="text-ink">Dodo Payments</span> — payment
          processing, invoicing and tax.
          <br />— <span className="text-ink">Supabase</span> — database hosting.
          <br />— <span className="text-ink">Vercel</span> — website hosting.
        </p>
        <p>
          When your browser loads a listing icon, the request goes to
          Google&apos;s public favicon service, which will see your IP address.
        </p>
      </Clause>

      <Clause heading="How long we keep it">
        <p>
          Listings and their payment records are kept for as long as the board
          exists, because they are the public record of what was paid. Financial
          records may be retained longer where tax law requires it.
        </p>
      </Clause>

      <Clause heading="Your rights">
        <p>
          You can ask us for a copy of the data we hold about you, ask us to
          correct it, or ask us to delete it. Email{""}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          {""}
          and we will respond within 30 days.
        </p>
        <p>
          Deleting a listing removes it from the board. We may retain the
          minimum payment record needed for accounting and fraud prevention.
        </p>
      </Clause>

      <Clause heading="Children">
        <p>
          This service is not intended for anyone under 18 and we do not
          knowingly collect data from children.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          Questions about this policy:{""}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </Clause>
    </LegalPage>
  );
}
"""

FILES['src/app/r/[id]/route.ts'] = r"""import { NextResponse } from "next/server";
import { SITE_URL, UTM_SOURCE } from "@/lib/config";
import { recordClick } from "@/lib/queries";
import { withUtm } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every outbound link goes through here so bidders can see what they bought.
 *
 * A 302 with no-store matters more than it looks: the default redirect() helper
 * emits a 307, which browsers and proxies happily cache — and a cached redirect
 * never reaches this handler again, so the click count silently stops moving.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const home = new URL("/", SITE_URL);

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.redirect(home, 302);
  }

  let destination: string | null = null;
  try {
    destination = await recordClick(id);
  } catch (error) {
    console.error("[click]", error);
  }

  if (!destination) return NextResponse.redirect(home, 302);

  return NextResponse.redirect(withUtm(destination, UTM_SOURCE), {
    status: 302,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
"""

FILES['src/app/refunds/page.tsx'] = r"""import { Clause, LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, POLICY_UPDATED, SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "Refund and Cancellation Policy",
  description: `How refunds and cancellations work on ${SITE_NAME}.`,
};

export default function RefundsPage() {
  return (
    <LegalPage title="Refund and Cancellation Policy" updated={POLICY_UPDATED}>
      <Clause heading="Nothing recurring to cancel">
        <p>
          Every bid is a single one-time payment. There is no subscription, no
          membership and no recurring charge, so there is nothing to cancel and
          no renewal to stop.
        </p>
      </Clause>

      <Clause heading="Bids are final">
        <p>
          A listing is delivered immediately on payment, so bids are
          non-refundable once the listing is live. You are paying for the
          position you hold, for as long as you hold it.
        </p>
        <p>
          Being outbid is not grounds for a refund. Your money does not return
          when someone pays more than you — that is how the board works and it
          is stated before you pay.
        </p>
      </Clause>

      <Clause heading="When we do refund">
        <p>We will refund you in full in these cases:</p>
        <p>
          — You were charged but your listing never appeared on the board, and
          we cannot make it appear.
          <br />— You were charged more than once for the same listing.
          <br />— A technical fault on our side made the listing unusable, for
          example the wrong destination link was saved and we cannot correct it.
        </p>
        <p>
          If we remove your listing for a reason that is not your fault, we will
          refund it.
        </p>
      </Clause>

      <Clause heading="When we do not refund">
        <p>
          — You changed your mind, or bid the wrong amount.
          <br />— You were outbid and your rank fell.
          <br />— The listing did not bring you the traffic you expected. We do
          not guarantee traffic.
          <br />— Your listing was removed for breaching our{""}
          <span className="text-ink">Terms of Service</span>.
        </p>
      </Clause>

      <Clause heading="How to request a refund">
        <p>
          Email{""}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          {""}
          from the address you used at checkout, within 14 days of the payment,
          including your payment reference and the link you listed.
        </p>
        <p>
          We reply to every request within 3 business days. Approved refunds are
          issued to your original payment method by Dodo Payments, our payment
          provider, and typically arrive within 5&ndash;10 business days
          depending on your bank.
        </p>
        <p>
          Please contact us before opening a dispute with your bank. We will fix
          genuine errors. A refunded listing is removed from the board.
        </p>
      </Clause>
    </LegalPage>
  );
}
"""

FILES['src/app/rules/page.tsx'] = r"""import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "Rules",
  description: `How ranking, listings and payments work on ${SITE_NAME}.`,
};

const SECTIONS = [
  {
    heading: "How ranking works",
    points: [
      "Rank is decided by your standing bid and nothing else. No votes, no editorial picks, no algorithm.",
      "Bids are whole US dollars. $1 gets you on the board.",
      "You don't have to outbid #1. Whatever you pay, you land wherever that amount places you.",
      "If two listings hold the same amount, the one that got there first ranks higher.",
      "Bid again on the same link at any time to raise it. The new amount replaces the old one — bids don't stack.",
    ],
  },
  {
    heading: "What you can list",
    points: [
      "A product, a company site, a landing page, a portfolio, or your own profile.",
      "Chat and invite links are not allowed — Telegram, WhatsApp, Discord, Messenger, Signal. Link the product, not the group.",
      "Link shorteners and file-sharing links are rejected for the same reason.",
      "One row per destination. Submitting variants of the same URL to hold two spots isn't allowed and gets both removed.",
      "Tracking and affiliate parameters are stripped from whatever you submit.",
    ],
  },
  {
    heading: "Payments",
    points: [
      "Payment is handled by Dodo Payments. Your rank updates when the payment clears, usually within seconds.",
      "Every bid is one-time and final. There are no refunds.",
      "Your money does not come back when someone outbids you. You are buying the position you had, for as long as you held it.",
      "Your rank will fall over time as others bid. That is the entire point of the board.",
      "If something goes wrong with a payment, email us before opening a dispute. We will fix genuine errors.",
    ],
  },
  {
    heading: "Removal",
    points: [
      "Malware, phishing, scams, adult content and anything illegal is removed without a refund.",
      "We may remove any listing at our discretion. This is a small site and that judgement stays with us.",
      "Removed listings keep their payment history but disappear from the board.",
    ],
  },
];

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <h1 className="mt-10 text-[44px] font-bold leading-none tracking-[-0.02em]">
        Rules
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-dim">
        Short version: you pay, you rank, you don&apos;t get it back.
      </p>

      <div className="mt-12 space-y-11 pt-10">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-[22px] font-bold tracking-[-0.02em]">
              {section.heading}
            </h2>
            <ul className="mt-4 space-y-3">
              {section.points.map((point) => (
                <li
                  key={point}
                  className="rounded-2xl bg-wash px-5 py-4 text-[14px] leading-relaxed text-dim"
                >
                  {point}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
"""

FILES['src/app/sitemap.ts'] = r"""import type { MetadataRoute } from "next";
import { CATEGORIES, SITE_URL } from "@/lib/config";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    { url: `${SITE_URL}/about`, lastModified: now, priority: 0.4 },
    { url: `${SITE_URL}/rules`, lastModified: now, priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, priority: 0.2 },
    { url: `${SITE_URL}/refunds`, lastModified: now, priority: 0.2 },
    ...CATEGORIES.map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
"""

FILES['src/app/success/page.tsx'] = r"""import Link from "next/link";
import { SuccessRank } from "@/components/SuccessRank";
import { SITE_NAME, SITE_URL } from "@/lib/config";

export const metadata = { title: "Payment received" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; u?: string; sponsor?: string }>;
}) {
  const { status, u, sponsor } = await searchParams;
  const failed = status && status !== "succeeded";
  const name = typeof u === "string" && u.length <= 200 ? u : null;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12 sm:px-6">
      <p className="label">
        {failed
          ? "Payment declined"
          : sponsor
            ? "Placement booked"
            : "Bid settled"}
      </p>

      <h1 className="mt-4 text-[38px] font-bold leading-[1.05] tracking-[-0.02em]">
        {failed
          ? "That payment didn't go through"
          : sponsor
            ? "The spot is yours"
            : "You're on the board"}
      </h1>

      <p className="mt-4 max-w-md text-[14px] leading-relaxed text-dim">
        {failed
          ? "Nothing was charged. Head back and try again — the spot is still open."
          : sponsor
            ? "Your card goes up the moment the payment clears, or queues behind the current rental if one is running."
            : name
              ? "Here's the spot you just took."
              : "Your listing appears within a few seconds of the payment clearing. If it hasn't shown up after a minute, email us and we'll sort it."}
      </p>

      {!failed && !sponsor && name ? (
        <SuccessRank name={name} siteName={SITE_NAME} siteUrl={SITE_URL} />
      ) : null}

      <div className="mt-8">
        <Link href="/" className="btn btn-ink">
          {failed ? "Back to the board" : `See it on ${SITE_NAME}`}
        </Link>
      </div>
    </main>
  );
}
"""

FILES['src/app/terms/page.tsx'] = r"""import Link from "next/link";
import { Clause, LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, POLICY_UPDATED, SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "Terms of Service",
  description: `The agreement you accept when you place a bid on ${SITE_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={POLICY_UPDATED}>
      <Clause heading="What this service is">
        <p>
          {SITE_NAME} is a public leaderboard of links. Position on the board is
          determined solely by the amount paid for that listing. There is no
          voting, no editorial selection, and no algorithm.
        </p>
        <p>
          By placing a bid you agree to these terms. If you do not agree, do not
          place a bid.
        </p>
      </Clause>

      <Clause heading="What you are buying">
        <p>
          You are buying a listing on the board at the rank your payment
          purchases, held for as long as no one outbids you. You are not buying
          a guaranteed rank, a guaranteed duration, guaranteed traffic, or any
          minimum number of clicks.
        </p>
        <p>
          Your rank will fall over time as other people bid higher. This is the
          intended behaviour of the service, not a fault.
        </p>
      </Clause>

      <Clause heading="Pricing">
        <p>
          Listings start at $1 USD. You choose the amount you pay. Bids are
          whole US dollars. Payment is one-time — there is no subscription and
          nothing recurring will be charged.
        </p>
        <p>
          Bidding again on a link you already hold raises its standing bid to
          the new amount. Bids do not accumulate.
        </p>
        <p>
          Applicable sales tax, VAT or GST is calculated and added at checkout
          by our payment provider based on your location.
        </p>
      </Clause>

      <Clause heading="Payment and delivery">
        <p>
          Payments are processed by Dodo Payments, which acts as the merchant of
          record for the transaction. Your listing appears on the board
          automatically once payment is confirmed, normally within seconds.
        </p>
        <p>
          If your payment succeeds but your listing has not appeared after a few
          minutes, contact us at{""}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          {""}
          with your payment reference and we will resolve it.
        </p>
      </Clause>

      <Clause heading="What you may list">
        <p>
          You may list a product, company site, landing page, portfolio, or your
          own public profile. You must own the link you submit or be authorised
          to promote it.
        </p>
        <p>
          You may not list: malware, phishing or fraudulent sites; content that
          is illegal in India or in your own jurisdiction; sexually explicit
          material; content that sexualises or endangers minors; content
          promoting violence, hatred or discrimination; chat and invite links;
          link shorteners; or file-sharing links.
        </p>
        <p>
          Submitting variants of the same URL in order to occupy more than one
          position is not permitted.
        </p>
      </Clause>

      <Clause heading="Removal">
        <p>
          We may remove any listing at our discretion, and we will remove
          anything that breaches the section above. Listings removed for a
          breach of these terms are not refunded.
        </p>
        <p>
          Outbound links from this site carry a{""}
          <code className="text-ink">nofollow sponsored</code> attribute. These
          are paid placements and are marked as such.
        </p>
      </Clause>

      <Clause heading="Liability">
        <p>
          The service is provided as-is. We are not responsible for the content,
          security or accuracy of any site listed on the board, and a listing is
          not an endorsement.
        </p>
        <p>
          To the extent permitted by law, our total liability to you for any
          claim relating to this service is limited to the amount you paid us in
          the twelve months before the claim arose.
        </p>
      </Clause>

      <Clause heading="Changes and contact">
        <p>
          We may update these terms. Material changes will be reflected in the
          date at the top of this page, and apply to bids placed after that
          date.
        </p>
        <p>
          Questions:{""}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          . See also our{""}
          <Link
            href="/refunds"
            className="text-accent underline underline-offset-4"
          >
            Refund and Cancellation Policy
          </Link>
          {""}
          and{""}
          <Link
            href="/privacy"
            className="text-accent underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Clause>
    </LegalPage>
  );
}
"""


changed = 0
for path in DELETE:
    if os.path.exists(path):
        os.remove(path)
        print("removed", path)
        changed += 1

for path, body in FILES.items():
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
    if old == body:
        print("same  ", path)
        continue
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(body)
    print("new   " if old is None else "wrote ", path)
    changed += 1

print()
print(f"{changed} change(s) applied")
