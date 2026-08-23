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

export type Entry = typeof entries.$inferSelect;
export type Bid = typeof bids.$inferSelect;
