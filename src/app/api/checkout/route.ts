import { NextResponse } from "next/server";
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
      return NextResponse.json({ error: "Unknown placement." }, { status: 400 });
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
    return NextResponse.json({ error: "The minimum bid is $1." }, { status: 400 });
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
