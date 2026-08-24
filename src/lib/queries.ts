import { and, count, desc, eq, gt, sql, sum } from "drizzle-orm";
import { db } from "./db";
import { bids, clickEvents, entries, sponsorSlots, visitors, type Entry } from "./db/schema";
import { PAGE_SIZE } from "./config";

export type RankedEntry = Entry & { rank: number };

/**
 * Rank is `bidCents` descending, ties broken by seniority (whoever got there
 * first stays higher). The window function keeps rank correct even when the
 * board is filtered by category — the number shown is always the global rank.
 */
const rankedBase = db
  .select({
    id: entries.id,
    url: entries.url,
    displayName: entries.displayName,
    title: entries.title,
    description: entries.description,
    faviconUrl: entries.faviconUrl,
    category: entries.category,
    bidCents: entries.bidCents,
    clicks: entries.clicks,
    status: entries.status,
    createdAt: entries.createdAt,
    updatedAt: entries.updatedAt,
    rank: sql<number>`row_number() over (order by ${entries.bidCents} desc, ${entries.createdAt} asc)`.as(
      "rank",
    ),
  })
  .from(entries)
  .where(and(eq(entries.status, "active"), gt(entries.bidCents, 0)))
  .as("ranked");

export async function getRankedEntries(opts: {
  page?: number;
  category?: string | null;
}): Promise<{ rows: RankedEntry[]; total: number; pages: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where = opts.category
    ? sql`${rankedBase.category} = ${opts.category}`
    : sql`true`;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(rankedBase)
      .where(where)
      .orderBy(sql`${rankedBase.rank} asc`)
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(rankedBase).where(where),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);

  return {
    rows: rows as RankedEntry[],
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** One listing with its live global rank, or null if it isn't on the board. */
export async function getEntryWithRank(id: string): Promise<RankedEntry | null> {
  const rows = await db
    .select()
    .from(rankedBase)
    .where(sql`${rankedBase.id} = ${id}`)
    .limit(1);
  const row = rows[0] as RankedEntry | undefined;
  return row ? { ...row, rank: Number(row.rank) } : null;
}

/** Same, looked up by display name — the success page only knows the name. */
export async function findEntryRankByName(
  name: string,
): Promise<RankedEntry | null> {
  const rows = await db
    .select()
    .from(rankedBase)
    .where(sql`${rankedBase.displayName} = ${name}`)
    .limit(1);
  const row = rows[0] as RankedEntry | undefined;
  return row ? { ...row, rank: Number(row.rank) } : null;
}

/** The current #1, used for the hero and the OG image. */
export async function getTopEntry(): Promise<RankedEntry | null> {
  const { rows } = await getRankedEntries({ page: 1, category: null });
  return rows[0] ?? null;
}

/**
 * What a bidder must pay to take a given rank: one dollar more than the entry
 * sitting there now. This is the whole game, so it lives in one place.
 */
export function priceToBeat(bidCents: number): number {
  return bidCents + 100;
}

/** Cheapest bid that would put someone at #1 right now. */
export async function getPriceForFirst(): Promise<number> {
  const top = await getTopEntry();
  return top ? priceToBeat(top.bidCents) : 100;
}

export async function getEntryByUrl(url: string): Promise<Entry | null> {
  const rows = await db
    .select()
    .from(entries)
    .where(eq(entries.url, url))
    .limit(1);
  return rows[0] ?? null;
}

export type ActivityItem = {
  id: string;
  displayName: string;
  faviconUrl: string | null;
  url: string;
  amountCents: number;
  createdAt: Date;
  entryId: string;
};

/** Newest settled bids, for the live tape. */
export async function getRecentActivity(limit = 12): Promise<ActivityItem[]> {
  const rows = await db
    .select({
      id: bids.id,
      displayName: entries.displayName,
      faviconUrl: entries.faviconUrl,
      url: entries.url,
      amountCents: bids.amountCents,
      createdAt: bids.createdAt,
      entryId: entries.id,
    })
    .from(bids)
    .innerJoin(entries, eq(bids.entryId, entries.id))
    .where(eq(entries.status, "active"))
    .orderBy(desc(bids.createdAt))
    .limit(limit);

  return rows;
}

export type BoardStats = {
  totalCents: number;
  listings: number;
  bidCount: number;
  topCents: number;
  /** Lifetime outbound clicks across active listings — the value stat. */
  totalClicks: number;
  /** Presence, server-side, so the pill renders complete on first paint. */
  onlineNow: number;
  totalVisitors: number;
};

export async function getStats(): Promise<BoardStats> {
  // One round trip. This used to be three parallel queries, which is three
  // statements in flight at once — and Supabase's transaction pooler does not
  // like several simultaneous statements on a single pooled connection.
  const rows = await db.execute<{
    total_cents: string;
    bid_count: string;
    listings: string;
    top_cents: string;
  }>(sql`
    select
      coalesce((select sum(amount_cents) from bids), 0)          as total_cents,
      (select count(*) from bids)                                 as bid_count,
      (select count(*) from entries
         where status = 'active' and bid_cents > 0)               as listings,
      coalesce((select max(bid_cents) from entries
         where status = 'active'), 0)                             as top_cents,
      coalesce((select sum(clicks) from entries
         where status = 'active'), 0)                             as total_clicks,
      (select count(*) from visitors
         where last_seen > now() - interval '150 seconds')        as online_now,
      (select count(*) from visitors)                             as total_visitors
  `);

  const row = (rows as unknown as Array<Record<string, unknown>>)[0] ?? {};

  return {
    totalCents: Number(row.total_cents ?? 0),
    bidCount: Number(row.bid_count ?? 0),
    listings: Number(row.listings ?? 0),
    topCents: Number(row.top_cents ?? 0),
    totalClicks: Number(row.total_clicks ?? 0),
    onlineNow: Number(row.online_now ?? 0),
    totalVisitors: Number(row.total_visitors ?? 0),
  };
}

/** Slugs that actually have listings, so empty pills never render. */
export async function getActiveCategories(): Promise<string[]> {
  const rows = await db
    .select({ category: entries.category })
    .from(entries)
    .where(and(eq(entries.status, "active"), gt(entries.bidCents, 0)))
    .groupBy(entries.category);
  return rows.map((r) => r.category);
}

/**
 * Settles a paid bid. Called only from the Dodo webhook.
 *
 * Two things make this safe to call more than once, which matters because
 * webhooks are retried until they get a 200:
 *   1. `paymentId` is unique on `bids`, so a replay hits the conflict clause.
 *   2. The entry upsert uses `greatest()`, so an out-of-order retry can never
 *      lower a bid that has since been raised.
 */
export async function settleBid(input: {
  url: string;
  displayName: string;
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  category: string;
  amountCents: number;
  paymentId: string;
  email: string | null;
}): Promise<{ applied: boolean; entryId: string }> {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(entries)
      .values({
        url: input.url,
        displayName: input.displayName,
        title: input.title,
        description: input.description,
        faviconUrl: input.faviconUrl,
        category: input.category,
        bidCents: input.amountCents,
      })
      .onConflictDoUpdate({
        target: entries.url,
        set: {
          bidCents: sql`greatest(${entries.bidCents}, ${input.amountCents})`,
          // Fresh metadata wins when we have it; otherwise keep what is there.
          title: sql`coalesce(${input.title}, ${entries.title})`,
          description: sql`coalesce(${input.description}, ${entries.description})`,
          faviconUrl: sql`coalesce(${input.faviconUrl}, ${entries.faviconUrl})`,
          category: input.category,
          updatedAt: new Date(),
        },
      })
      .returning({ id: entries.id });

    const inserted = await tx
      .insert(bids)
      .values({
        entryId: entry.id,
        amountCents: input.amountCents,
        paymentId: input.paymentId,
        email: input.email,
      })
      .onConflictDoNothing({ target: bids.paymentId })
      .returning({ id: bids.id });

    return { applied: inserted.length > 0, entryId: entry.id };
  });
}

/** Counts an outbound click and returns the destination. */
export async function recordClick(id: string): Promise<string | null> {
  const rows = await db
    .update(entries)
    .set({ clicks: sql`${entries.clicks} + 1` })
    .where(and(eq(entries.id, id), eq(entries.status, "active")))
    .returning({ url: entries.url });

  const url = rows[0]?.url ?? null;

  if (url) {
    // The event log powers the traffic feed and the sponsor's window count.
    // If this insert fails the visitor still gets their redirect — losing one
    // feed item is better than eating the click.
    try {
      await db.insert(clickEvents).values({ entryId: id });
    } catch (error) {
      console.error("[click-event]", error);
    }
  }

  return url;
}

export type TrafficItem = {
  id: string;
  displayName: string;
  faviconUrl: string | null;
  createdAt: Date;
};

/** Newest outbound clicks, for the live traffic rail. */
export async function getRecentClicks(limit = 10): Promise<TrafficItem[]> {
  return db
    .select({
      id: clickEvents.id,
      displayName: entries.displayName,
      faviconUrl: entries.faviconUrl,
      createdAt: clickEvents.createdAt,
    })
    .from(clickEvents)
    .innerJoin(entries, eq(clickEvents.entryId, entries.id))
    .where(
      and(
        eq(entries.status, "active"),
        // The ticker only shows fresh movement — a stale "5 hours ago" item
        // reads worse than showing nothing.
        gt(clickEvents.createdAt, sql`now() - interval '24 hours'`),
      ),
    )
    .orderBy(desc(clickEvents.createdAt))
    .limit(limit);
}

export type SponsorState = {
  current: {
    entryId: string;
    displayName: string;
    title: string | null;
    description: string | null;
    faviconUrl: string | null;
    url: string;
    /** Clicks measured inside this rental, not lifetime. */
    windowClicks: number;
    startsAt: string;
    endsAt: string;
  } | null;
  /** When the spot next opens up — now, if nothing is queued. */
  nextOpenAt: string;
};

export async function getSponsorState(): Promise<SponsorState> {
  const now = new Date();

  const [slot] = await db
    .select({
      entryId: sponsorSlots.entryId,
      displayName: entries.displayName,
      title: entries.title,
      description: entries.description,
      faviconUrl: entries.faviconUrl,
      url: entries.url,
      startsAt: sponsorSlots.startsAt,
      endsAt: sponsorSlots.endsAt,
    })
    .from(sponsorSlots)
    .innerJoin(entries, eq(sponsorSlots.entryId, entries.id))
    .where(
      and(
        eq(sponsorSlots.status, "active"),
        sql`${sponsorSlots.startsAt} <= now()`,
        sql`${sponsorSlots.endsAt} > now()`,
      ),
    )
    .orderBy(sponsorSlots.startsAt)
    .limit(1);

  const [queueTail] = await db
    .select({ endsAt: sql<string>`max(${sponsorSlots.endsAt})` })
    .from(sponsorSlots)
    .where(and(eq(sponsorSlots.status, "active"), gt(sponsorSlots.endsAt, now)));

  const nextOpenAt = queueTail?.endsAt ? new Date(queueTail.endsAt) : now;

  if (!slot) {
    return { current: null, nextOpenAt: nextOpenAt.toISOString() };
  }

  const [clicksRow] = await db
    .select({ n: count() })
    .from(clickEvents)
    .where(
      and(
        eq(clickEvents.entryId, slot.entryId),
        gt(clickEvents.createdAt, slot.startsAt),
      ),
    );

  return {
    current: {
      entryId: slot.entryId,
      displayName: slot.displayName,
      title: slot.title,
      description: slot.description,
      faviconUrl: slot.faviconUrl,
      url: slot.url,
      windowClicks: Number(clicksRow?.n ?? 0),
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
    },
    nextOpenAt: nextOpenAt.toISOString(),
  };
}

/**
 * Settles a paid sponsor rental. Same idempotency contract as settleBid.
 * The rental starts when the current queue ends, so buying while someone
 * else's slot runs queues you behind them rather than overwriting them.
 */
export async function settleSponsor(input: {
  url: string;
  displayName: string;
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  days: number;
  amountCents: number;
  paymentId: string;
}): Promise<{ applied: boolean }> {
  return db.transaction(async (tx) => {
    // The sponsored product doesn't have to be on the ranked board — a zero
    // bid keeps it out of the ranking (the board filters bid_cents > 0) while
    // still giving the slot a real entry row to point at.
    const [entry] = await tx
      .insert(entries)
      .values({
        url: input.url,
        displayName: input.displayName,
        title: input.title,
        description: input.description,
        faviconUrl: input.faviconUrl,
      })
      .onConflictDoUpdate({
        target: entries.url,
        set: {
          title: sql`coalesce(${input.title}, ${entries.title})`,
          description: sql`coalesce(${input.description}, ${entries.description})`,
          faviconUrl: sql`coalesce(${input.faviconUrl}, ${entries.faviconUrl})`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: entries.id });

    const [tail] = await tx
      .select({ endsAt: sql<string>`max(${sponsorSlots.endsAt})` })
      .from(sponsorSlots)
      .where(
        and(eq(sponsorSlots.status, "active"), gt(sponsorSlots.endsAt, new Date())),
      );

    const startsAt = tail?.endsAt ? new Date(tail.endsAt) : new Date();
    const endsAt = new Date(startsAt.getTime() + input.days * 86_400_000);

    const inserted = await tx
      .insert(sponsorSlots)
      .values({
        entryId: entry.id,
        paymentId: input.paymentId,
        amountCents: input.amountCents,
        startsAt,
        endsAt,
      })
      .onConflictDoNothing({ target: sponsorSlots.paymentId })
      .returning({ id: sponsorSlots.id });

    return { applied: inserted.length > 0 };
  });
}

/** Takes a refunded rental off the rotation. Keeps the row as a record. */
export async function reverseSponsor(paymentId: string): Promise<boolean> {
  const rows = await db
    .update(sponsorSlots)
    .set({ status: "reversed" })
    .where(eq(sponsorSlots.paymentId, paymentId))
    .returning({ id: sponsorSlots.id });
  return rows.length > 0;
}

/**
 * Reverses a settled bid after a refund or a lost dispute. The bid row is kept
 * as a record, but the listing drops back to whatever it legitimately paid
 * before — or off the board entirely if that was its only bid.
 */
export async function reverseBid(paymentId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [bid] = await tx
      .select({ id: bids.id, entryId: bids.entryId })
      .from(bids)
      .where(eq(bids.paymentId, paymentId))
      .limit(1);

    if (!bid) return false;

    await tx.delete(bids).where(eq(bids.id, bid.id));

    // Whatever this listing legitimately paid before the reversed bid.
    const [previous] = await tx
      .select({ amount: bids.amountCents })
      .from(bids)
      .where(eq(bids.entryId, bid.entryId))
      .orderBy(desc(bids.amountCents))
      .limit(1);

    await tx
      .update(entries)
      .set({
        bidCents: previous?.amount ?? 0,
        status: previous ? "active" : "hidden",
        updatedAt: new Date(),
      })
      .where(eq(entries.id, bid.entryId));

    return true;
  });
}
