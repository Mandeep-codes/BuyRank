import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One row per listing on the board. `bidCents` is the current standing bid and
 * is the only thing that decides rank.
 */
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Normalised URL. Unique — one row per destination, no duplicate stuffing. */
    url: text("url").notNull(),
    /** What we print on the row: "acme.com" or "@handle on X". */
    displayName: text("display_name").notNull(),
    title: text("title"),
    description: text("description"),
    faviconUrl: text("favicon_url"),
    category: text("category").notNull().default("other"),
    bidCents: integer("bid_cents").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    /** active | hidden — hidden rows are moderated out but keep their history. */
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    urlIdx: uniqueIndex("entries_url_idx").on(t.url),
    // The ranking index. Ties break on seniority, so createdAt ascends.
    rankIdx: index("entries_rank_idx").on(t.bidCents, t.createdAt),
    categoryIdx: index("entries_category_idx").on(t.category),
  }),
);

/**
 * Immutable audit log. Every successful payment writes exactly one row.
 * `paymentId` is unique, which is what makes webhook retries safe.
 */
export const bids = pgTable(
  "bids",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    paymentId: text("payment_id").notNull(),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    paymentIdx: uniqueIndex("bids_payment_idx").on(t.paymentId),
    entryIdx: index("bids_entry_idx").on(t.entryId),
    createdIdx: index("bids_created_idx").on(t.createdAt),
  }),
);

/**
 * Anonymous presence. One row per browser that has ever opened the site,
 * keyed by a random token the browser generates — no IP, no fingerprint,
 * nothing that identifies a person.
 *
 * "online" is a count of rows touched in the last couple of minutes;
 * "total" is just the row count.
 */
export const visitors = pgTable(
  "visitors",
  {
    id: text("id").primaryKey(),
    firstSeen: timestamp("first_seen", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    lastSeenIdx: index("visitors_last_seen_idx").on(t.lastSeen),
  }),
);

/**
 * One row per outbound click, so the traffic feed can show individual events
 * and the sponsor card can count clicks inside its own rental window. The
 * per-entry `clicks` counter stays as the cheap running total; this table is
 * the receipts.
 */
export const clickEvents = pgTable(
  "click_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdIdx: index("click_events_created_idx").on(t.createdAt),
    entryCreatedIdx: index("click_events_entry_created_idx").on(
      t.entryId,
      t.createdAt,
    ),
  }),
);

/**
 * The rented "Sponsored" placement. One slot, sold by the day; consecutive
 * purchases queue back-to-back. `paymentId` is unique for the same reason it
 * is on `bids`: webhook retries must not create a second rental.
 */
export const sponsorSlots = pgTable(
  "sponsor_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    paymentId: text("payment_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** premium | plus | standard — which placement this rental bought. */
    tier: text("tier").notNull().default("standard"),
    /** active | reversed — reversed slots keep their row but never render. */
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    paymentIdx: uniqueIndex("sponsor_slots_payment_idx").on(t.paymentId),
    endsIdx: index("sponsor_slots_ends_idx").on(t.endsAt),
  }),
);

export type Entry = typeof entries.$inferSelect;
export type Bid = typeof bids.$inferSelect;
export type SponsorSlot = typeof sponsorSlots.$inferSelect;
