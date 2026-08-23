import { and, count, desc, eq, gt, sql, sum } from "drizzle-orm";
import { db } from "./db";
import { bids, entries, type Entry } from "./db/schema";
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
};

export async function getStats(): Promise<BoardStats> {
  const [revenue, listings, top] = await Promise.all([
    db
      .select({ total: sum(bids.amountCents), n: count() })
      .from(bids),
    db
      .select({ value: count() })
      .from(entries)
      .where(and(eq(entries.status, "active"), gt(entries.bidCents, 0))),
    db
      .select({ value: entries.bidCents })
      .from(entries)
      .where(and(eq(entries.status, "active")))
      .orderBy(desc(entries.bidCents))
      .limit(1),
  ]);

  return {
    totalCents: Number(revenue[0]?.total ?? 0),
    bidCount: Number(revenue[0]?.n ?? 0),
    listings: Number(listings[0]?.value ?? 0),
    topCents: Number(top[0]?.value ?? 0),
  };
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
  return rows[0]?.url ?? null;
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
