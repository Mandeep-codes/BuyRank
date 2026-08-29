#!/usr/bin/env python3
# BuyRank redesign - palette, stylesheet, layout, schema, queries
# Run from the repo root. Idempotent: re-running prints "same" and writes nothing.
import os, sys

if not os.path.isdir("src/app"):
    sys.exit("run this from the repo root (the folder holding package.json)")

FILES = {}
DELETE = ['src/lib/denom.ts']

FILES['tailwind.config.ts'] = r"""import type { Config } from "tailwindcss";

/**
 * Every colour resolves through a CSS variable rather than a literal, so the
 * whole site repaints from the palette block at the top of globals.css. Names
 * are about role, not hue.
 */
const themed = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: themed("paper"), // the page
        wash: themed("wash"), // table headers, inset fills
        edge: themed("edge"), // hairlines
        ink: themed("ink"), // primary text and solid buttons
        dim: themed("dim"), // secondary text
        accent: themed("accent"), // the one warm note
        accentwash: themed("accentwash"),
        // The white solid in the middle of the page, lit from above.
        face1: themed("face1"), // treads
        face2: themed("face2"), // risers
        face3: themed("face3"), // side wall
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
"""

FILES['src/app/globals.css'] = r"""@tailwind base;
@tailwind utilities;
@tailwind components;

/* ---- Palette --------------------------------------------------------------
   White page, near-black ink, hairline greys, and one warm note reserved for
   the claim action. Channels are raw RGB triples so they work both as plain
   colours and inside rgb(... / alpha).
   --------------------------------------------------------------------------- */

:root {
  --paper-rgb: 255, 255, 255;
  --wash-rgb: 250, 250, 250;
  --edge-rgb: 233, 233, 233;
  --ink-rgb: 17, 17, 17;
  --dim-rgb: 140, 140, 140;
  --accent-rgb: 176, 128, 12;
  --accentwash-rgb: 253, 247, 229;

  /* The solid. Three greys for three planes, lit from above. */
  --face1-rgb: 247, 247, 247;
  --face2-rgb: 233, 233, 233;
  --face3-rgb: 219, 219, 219;

  --paper: rgb(var(--paper-rgb));
  --wash: rgb(var(--wash-rgb));
  --edge: rgb(var(--edge-rgb));
  --ink: rgb(var(--ink-rgb));
  --dim: rgb(var(--dim-rgb));
  --accent: rgb(var(--accent-rgb));
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
    background: var(--paper);
  }

  html,
  body {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: hidden;
  }

  body {
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-sans), system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  main,
  section,
  header,
  footer,
  nav,
  ol,
  ul,
  li,
  form,
  article,
  aside,
  div {
    min-width: 0;
    max-width: 100%;
  }

  img,
  svg,
  video,
  canvas,
  input,
  select,
  textarea,
  button {
    max-width: 100%;
  }

  ::selection {
    background: var(--ink);
    color: var(--paper);
  }

  :focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
}

@layer components {
  /* Small caps set in mono. Every column head and rail heading on the page is
     one of these; they are the only uppercase text anywhere. */
  .label {
    font-family: var(--font-mono), ui-monospace, monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--dim);
  }

  .tnum {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
  }

  .denom {
    font-family: var(--font-display), system-ui, sans-serif;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  /* A card: white, one hairline, barely any shadow. */
  .card {
    background: var(--paper);
    border: 1px solid var(--edge);
    border-radius: 14px;
  }

  /* The square that holds a logo or a plus sign. */
  .tile {
    display: grid;
    place-items: center;
    border: 1px solid var(--edge);
    border-radius: 10px;
    background: var(--paper);
    color: var(--dim);
  }

  /* ---- Controls ---------------------------------------------------------- */

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border: 1px solid transparent;
    border-radius: 9px;
    padding: 0.6rem 1.1rem;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.005em;
    line-height: 1.2;
    white-space: nowrap;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      color 150ms ease,
      opacity 150ms ease;
  }

  /* Solid ink. The action that takes something from somebody. */
  .btn-ink {
    background: var(--ink);
    color: var(--paper);
  }

  .btn-ink:hover:not(:disabled) {
    background: rgb(var(--ink-rgb) / 0.85);
  }

  .btn-ink:disabled {
    background: rgb(var(--ink-rgb) / 0.2);
    cursor: not-allowed;
  }

  /* The warm one. Claiming something nobody holds yet. */
  .btn-claim {
    background: var(--accentwash);
    border-color: rgb(var(--accent-rgb) / 0.22);
    color: var(--accent);
  }

  .btn-claim:hover:not(:disabled) {
    background: rgb(var(--accent-rgb) / 0.16);
  }

  .btn-claim:disabled {
    color: rgb(var(--accent-rgb) / 0.45);
    cursor: not-allowed;
  }

  .btn-quiet {
    background: var(--paper);
    border-color: var(--edge);
    color: var(--ink);
  }

  .btn-quiet:hover:not(:disabled) {
    background: var(--wash);
  }

  .btn-quiet:disabled {
    color: var(--dim);
    cursor: not-allowed;
  }

  .field {
    width: 100%;
    border: 1px solid var(--edge);
    border-radius: 10px;
    background: var(--paper);
    padding: 0.8rem 0.95rem;
    /* 16px, or iOS Safari zooms the page on focus. */
    font-size: 16px;
    color: var(--ink);
    outline: none;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .field::placeholder {
    color: var(--dim);
  }

  .field:focus {
    border-color: rgb(var(--ink-rgb) / 0.45);
    box-shadow: 0 0 0 3px rgb(var(--ink-rgb) / 0.06);
  }

  .step {
    display: grid;
    place-items: center;
    border: 1px solid var(--edge);
    border-radius: 10px;
    background: var(--paper);
    color: var(--ink);
    line-height: 1;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .step:hover:not(:disabled) {
    background: var(--wash);
    border-color: rgb(var(--ink-rgb) / 0.3);
  }

  .step:disabled {
    color: rgb(var(--dim-rgb) / 0.6);
    cursor: not-allowed;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--edge);
    border-radius: 999px;
    background: var(--paper);
    padding: 0.4rem 0.85rem;
    font-size: 13px;
    font-weight: 500;
    color: var(--dim);
    white-space: nowrap;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      border-color 150ms ease;
  }

  .chip:hover {
    background: var(--wash);
    color: var(--ink);
  }

  .chip-on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--paper);
  }

  .chip-on:hover {
    background: var(--ink);
    color: var(--paper);
  }

  /* ---- The table --------------------------------------------------------- */

  .sheet {
    border: 1px solid var(--edge);
    border-radius: 14px;
    overflow: hidden;
    background: var(--paper);
  }

  .sheet-head {
    background: var(--wash);
    border-bottom: 1px solid var(--edge);
  }

  .sheet-row + .sheet-row {
    border-top: 1px solid var(--edge);
  }

  .sheet-row {
    transition: background-color 150ms ease;
  }

  .sheet-row:hover {
    background: var(--wash);
  }

  /* ---- The solid --------------------------------------------------------- */

  .step3d {
    cursor: pointer;
  }

  .step3d:focus {
    outline: none;
  }

  /* The lift lives on its own group so the entry animation above it, which
     carries a fill mode, cannot win against the hover rule. */
  .step3d-lift {
    transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .step3d:hover .step3d-lift,
  .step3d:focus-visible .step3d-lift {
    transform: translate(0, -9px);
  }

  .step3d-hl {
    opacity: 0;
    transition: opacity 220ms ease;
  }

  .step3d:hover .step3d-hl,
  .step3d:focus-visible .step3d-hl {
    opacity: 1;
  }

  .step3d-tag {
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
  }

  .step3d:hover .step3d-tag,
  .step3d:focus-visible .step3d-tag {
    opacity: 1;
  }

  /* The flight assembles itself from the bottom step up on first paint. */
  .climb {
    animation: climb 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(var(--i, 0) * 55ms);
  }

  @keyframes climb {
    from {
      opacity: 0;
      transform: translate(0, 22px);
    }
    to {
      opacity: 1;
      transform: translate(0, 0);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .climb {
    opacity: 1 !important;
    transform: none !important;
  }

  .step3d:hover .step3d-lift,
  .step3d:focus-visible .step3d-lift {
    transform: none;
  }
}
"""

FILES['src/app/layout.tsx'] = r"""import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Outfit } from "next/font/google";
import Link from "next/link";
import {
  CONTACT_EMAIL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/config";
import "./globals.css";

/**
 * Three roles. Outfit's geometric numerals carry the headings and every price,
 * Inter does the reading, and Plex Mono is reserved for the small caps column
 * heads and the index numbers down the left of the table.
 */
const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — rank is bought, not earned`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen antialiased">
        {children}

        <footer className="mt-24 border-t border-edge">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="max-w-lg font-display text-[20px] font-semibold leading-snug tracking-[-0.02em]">
                Every step on this staircase was paid for.{" "}
                <span className="text-dim">Nobody voted.</span>
              </p>
              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-dim">
                Listings start at $1. One payment, no subscription, and no
                refund when the next person outbids you. Payments handled by
                Dodo Payments.
              </p>
            </div>

            <nav className="grid gap-2.5 md:justify-items-end">
              <p className="label">Index</p>
              {[
                { href: "/about", label: "About" },
                { href: "/rules", label: "Rules" },
                { href: "/terms", label: "Terms" },
                { href: "/privacy", label: "Privacy" },
                { href: "/refunds", label: "Refunds" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[13px] text-dim transition hover:text-ink"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[13px] text-dim transition hover:text-ink"
              >
                Contact
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
"""

FILES['src/lib/config.ts'] = r"""export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "bidboard";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const SITE_TAGLINE = "The board is bought, not earned.";
/** Monitored support address. Payment review checks that this is reachable. */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com";
/** Shown on the legal pages. Update when you change the policies. */
export const POLICY_UPDATED = "23 August 2026";
export const SITE_DESCRIPTION =
  "A public leaderboard where rank is decided by money. Bid $1 to get on. Pay more than the row above you to climb.";

/** Cheapest bid that gets you on the board, in cents. */
export const MIN_BID_CENTS = 100;
/** Nobody can bid more than this in one go. Sanity guard against fat fingers. */
export const MAX_BID_CENTS = 5_000_000;
/** Rows shown per page. */
export const PAGE_SIZE = 50;

/**
 * Sponsored placements, priced by position. Each tier is its own card with
 * its own queue; higher tiers sit higher on the page. Prices are server-
 * derived at checkout — never trusted from the browser.
 */
export type SponsorTier = {
  id: "premium" | "plus" | "standard";
  label: string;
  priceCentsPerDay: number;
};

export const SPONSOR_TIERS: SponsorTier[] = [
  { id: "premium", label: "Premium", priceCentsPerDay: 2_500 },
  { id: "plus", label: "Plus", priceCentsPerDay: 1_500 },
  { id: "standard", label: "Standard", priceCentsPerDay: 500 },
];

export function sponsorTier(id: string): SponsorTier | null {
  return SPONSOR_TIERS.find((t) => t.id === id) ?? null;
}

/** Longest single rental. Keeps the queue short and the spot contestable. */
export const SPONSOR_MAX_DAYS = 7;

/**
 * Display thresholds: a stat that argues against the site is worse than no
 * stat. These hide real-but-weak numbers until they read as strength — the
 * numbers themselves are never altered.
 */
export const MIN_ONLINE_TO_SHOW = 5;
export const MIN_PAID_STAT_CENTS = 10_000;
export const MIN_CLICKS_STAT = 10;
export const MIN_VIEWS_STAT = 25;
/** Visitors since launch is only shown once it reads as a crowd. */
export const MIN_VISITORS_TO_SHOW = 50;
/** Appended to every outbound link so bidders can attribute their traffic. */
export const UTM_SOURCE = SITE_NAME.toLowerCase().replace(/\s+/g, "");

export const CATEGORIES = [
  { slug: "ai-agents", label: "AI Agents & Infrastructure" },
  { slug: "seo-visibility", label: "SEO & AI Visibility" },
  { slug: "developer-tools", label: "Developer Tools" },
  { slug: "marketing-advertising", label: "Marketing & Advertising" },
  { slug: "design-creative", label: "Design & Creative" },
  { slug: "productivity", label: "Productivity & Personal Tools" },
  { slug: "social-creator", label: "Social Media & Creator Tools" },
  { slug: "writing-content", label: "Writing & Content" },
  { slug: "sales-leadgen", label: "Sales & Lead Generation" },
  { slug: "business-finance", label: "Business, Finance & Legal" },
  { slug: "ecommerce-retail", label: "Ecommerce & Retail" },
  { slug: "health-fitness", label: "Health, Fitness & Wellness" },
  { slug: "education", label: "Education & Learning" },
  { slug: "games-entertainment", label: "Games & Entertainment" },
  { slug: "crypto-investing", label: "Crypto, Web3 & Investing" },
  { slug: "hiring-careers", label: "Hiring, Jobs & Careers" },
  { slug: "agencies-services", label: "Agencies, Studios & Services" },
  { slug: "security-privacy", label: "Security, Privacy & Compliance" },
  { slug: "media-generation", label: "AI Media Generation" },
  { slug: "audio-podcasting", label: "Audio, Voice & Podcasting" },
  { slug: "domains-assets", label: "Domains & Web Assets" },
  { slug: "people-profiles", label: "People & Profiles" },
  { slug: "other", label: "Other" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as string[];

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? "Other";
}
"""

FILES['src/lib/db/schema.ts'] = r"""import {
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
    /**
     * Times this listing has actually been rendered on a board someone looked
     * at. Counted separately from clicks because it answers a different
     * question: clicks are what a bidder got, views are how often they were
     * put in front of somebody. Both are recorded, neither is seeded.
     */
    views: integer("views").notNull().default(0),
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
"""

FILES['src/lib/queries.ts'] = r"""import { and, count, desc, eq, gt, inArray, sql, sum } from "drizzle-orm";
import { db } from "./db";
import {
  bids,
  clickEvents,
  entries,
  sponsorSlots,
  visitors,
  type Entry,
} from "./db/schema";
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
    views: entries.views,
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
export async function getEntryWithRank(
  id: string,
): Promise<RankedEntry | null> {
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
  /** Lifetime impressions across active listings. */
  totalViews: number;
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
      coalesce((select sum(views) from entries
         where status = 'active'), 0)                             as total_views,
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
    totalViews: Number(row.total_views ?? 0),
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

export type SponsorTierId = "premium" | "plus" | "standard";

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

export type AllSponsorStates = Record<SponsorTierId, SponsorState>;

export async function getSponsorStates(): Promise<AllSponsorStates> {
  const now = new Date();

  const activeSlots = await db
    .select({
      tier: sponsorSlots.tier,
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
    .orderBy(sponsorSlots.startsAt);

  const tails = await db
    .select({
      tier: sponsorSlots.tier,
      endsAt: sql<string>`max(${sponsorSlots.endsAt})`,
    })
    .from(sponsorSlots)
    .where(and(eq(sponsorSlots.status, "active"), gt(sponsorSlots.endsAt, now)))
    .groupBy(sponsorSlots.tier);

  const states = {} as AllSponsorStates;

  for (const tier of ["premium", "plus", "standard"] as const) {
    const slot = activeSlots.find((s) => s.tier === tier);
    const tail = tails.find((t) => t.tier === tier);
    const nextOpenAt = tail?.endsAt ? new Date(tail.endsAt) : now;

    if (!slot) {
      states[tier] = { current: null, nextOpenAt: nextOpenAt.toISOString() };
      continue;
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

    states[tier] = {
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

  return states;
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
  tier: SponsorTierId;
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

    // Queues are per tier: buying Premium while Premium runs queues behind
    // it, but never blocks the other placements.
    const [tail] = await tx
      .select({ endsAt: sql<string>`max(${sponsorSlots.endsAt})` })
      .from(sponsorSlots)
      .where(
        and(
          eq(sponsorSlots.status, "active"),
          eq(sponsorSlots.tier, input.tier),
          gt(sponsorSlots.endsAt, new Date()),
        ),
      );

    const startsAt = tail?.endsAt ? new Date(tail.endsAt) : new Date();
    const endsAt = new Date(startsAt.getTime() + input.days * 86_400_000);

    const inserted = await tx
      .insert(sponsorSlots)
      .values({
        entryId: entry.id,
        paymentId: input.paymentId,
        amountCents: input.amountCents,
        tier: input.tier,
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

/**
 * Records that these listings were rendered on a board somebody loaded.
 *
 * One statement for the whole page, and only ever +1 per listing per call —
 * the browser is rate limited and sends a given board at most once per
 * session, so this counts impressions rather than renders. Nothing here seeds
 * a starting value: the number is small on day one because it is real, and it
 * climbs on its own from the first visitor.
 */
export async function recordImpressions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(entries)
    .set({ views: sql`${entries.views} + 1` })
    .where(and(eq(entries.status, "active"), inArray(entries.id, ids)));
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
