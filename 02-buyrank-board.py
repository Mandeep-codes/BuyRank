#!/usr/bin/env python3
# BuyRank redesign - the white solid, home page, every component
# Run from the repo root. Idempotent: re-running prints "same" and writes nothing.
import os, sys

if not os.path.isdir("src/app"):
    sys.exit("run this from the repo root (the folder holding package.json)")

FILES = {}
DELETE = ['src/lib/denom.ts']

FILES['src/app/page.tsx'] = r"""import { CategoryPills } from "@/components/CategoryPills";
import { EntryRow } from "@/components/EntryRow";
import { ClaimPanel } from "@/components/ClaimPanel";
import { Masthead } from "@/components/Masthead";
import { Pagination } from "@/components/Pagination";
import { ActivityStrip } from "@/components/ActivityStrip";
import { ClickTicker } from "@/components/ClickTicker";
import { SponsorSlot } from "@/components/SponsorSlot";
import { Staircase } from "@/components/Staircase";
import { SetupNotice, databaseErrorCode } from "@/components/SetupNotice";
import { SPONSOR_TIERS } from "@/lib/config";
import { paymentsConfigured } from "@/lib/dodo";
import {
  cachedActivity,
  cachedBoard,
  cachedCategories,
  cachedClicks,
  cachedSponsors,
  cachedStats,
} from "@/lib/cache";
import { priceToBeat } from "@/lib/queries";

/**
 * This route reads searchParams, so it renders dynamically — `revalidate` here
 * would do nothing. The caching lives in @/lib/cache instead, around the
 * queries themselves, and the payment webhook drops it when a bid lands.
 */
export const maxDuration = 60;

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let board, stats, activity, clicks, sponsors, categories;

  try {
    [board, stats, activity, clicks, sponsors, categories] = await Promise.all([
      cachedBoard(page, null),
      cachedStats(),
      cachedActivity(),
      cachedClicks(),
      cachedSponsors(),
      cachedCategories(),
    ]);
  } catch (error) {
    // Only intercept database problems we can explain. Everything else is a
    // real bug and deserves its stack trace.
    const code = databaseErrorCode(error);
    if (code && process.env.NODE_ENV !== "production") {
      return <SetupNotice code={code} />;
    }
    throw error;
  }

  const priceForFirst = stats.topCents > 0 ? priceToBeat(stats.topCents) : 100;
  // Who holds #1 — the page names the fight instead of an abstract claim.
  const top = board.rows[0];
  // postgres returns window-function output as a string; compare loosely-cast.
  const leader =
    page === 1 && top && Number(top.rank) === 1
      ? { name: top.displayName, cents: top.bidCents }
      : null;
  const paying = paymentsConfigured();

  return (
    <main>
      <Masthead stats={stats} />
      <ClickTicker initial={clicks} />

      {/* The object on its sweep, with the placements either side of it. */}
      <div className="mx-auto max-w-[86rem] px-5 pb-6 pt-10 sm:px-8 sm:pt-14">
        <div className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)_15rem] lg:gap-10">
          <div className="order-2 grid gap-4 lg:order-none lg:pt-6">
            <p className="label">Sponsored ads</p>
            <SponsorSlot
              tier={SPONSOR_TIERS[0]}
              index={1}
              initial={sponsors.premium}
              enabled={paying}
            />
            <SponsorSlot
              tier={SPONSOR_TIERS[1]}
              index={2}
              initial={sponsors.plus}
              enabled={paying}
            />
          </div>

          <div className="order-1 min-w-0 lg:order-none">
            <Staircase rows={board.rows} />
          </div>

          <div className="order-3 grid gap-4 lg:order-none lg:pt-6">
            <p className="label lg:text-right">Sponsored ads</p>
            <SponsorSlot
              tier={SPONSOR_TIERS[2]}
              index={3}
              initial={sponsors.standard}
              enabled={paying}
            />
            <ActivityStrip initial={activity} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <ClaimPanel
            priceForFirst={priceForFirst}
            enabled={paying}
            leader={leader}
          />
        </div>

        <section aria-label="Steps" className="mt-16">
          <h2 className="font-display text-[30px] font-semibold tracking-[-0.03em]">
            Steps
          </h2>
          <p className="mt-1.5 text-[14px] text-dim">
            Every step shows its current top bid. Pay more than the one above
            you and you take its place.
          </p>

          <div className="mt-6">
            <CategoryPills available={categories} />
          </div>

          {board.rows.length === 0 ? (
            <div className="card mt-6 px-6 py-20 text-center">
              <p className="font-display text-[20px] font-semibold tracking-[-0.02em]">
                No steps taken yet
              </p>
              <p className="mt-2 text-[14px] text-dim">
                One dollar claims the top of the flight.
              </p>
            </div>
          ) : (
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
          )}

          <Pagination page={page} pages={board.pages} basePath="/" />
        </section>
      </div>
    </main>
  );
}
"""

FILES['src/components/ActivityStrip.tsx'] = r""""use client";

import { useSyncExternalStore } from "react";
import { Favicon } from "@/components/Favicon";
import { formatUsd } from "@/lib/format";

type Item = {
  id: string;
  displayName: string;
  faviconUrl?: string | null;
  url?: string;
  amountCents: number;
  createdAt: string;
  entryId: string;
};

/** One poll shared across every mount, started by the first subscriber. */
const POLL_MS = 20_000;

let snapshot: Item[] = [];
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

async function poll() {
  if (inFlight) return;
  inFlight = true;
  try {
    const res = await fetch("/api/activity");
    if (!res.ok) return;
    const data = (await res.json()) as { items: Item[] };
    if (Array.isArray(data.items)) {
      snapshot = data.items;
      listeners.forEach((l) => l());
    }
  } catch {
    // A dropped poll isn't worth surfacing; the next one catches up.
  } finally {
    inFlight = false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) timer = setInterval(poll, POLL_MS);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * Settled payments, newest first — the order money arrived in. No clock: the
 * list is already in time order, and a timestamp on each line only invites the
 * reader to judge the board by how busy it is instead of by what it costs.
 */
export function ActivityStrip({ initial }: { initial: Item[] }) {
  const items = useSyncExternalStore(
    subscribe,
    () => (snapshot.length > 0 ? snapshot : initial),
    () => initial,
  );

  return (
    <aside aria-label="Recent bids" className="card p-4">
      <div className="flex items-center justify-between border-b border-edge pb-2.5">
        <h2 className="label">Money in</h2>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-dim">
          Nothing has settled yet. The first payment shows up here.
        </p>
      ) : (
        <ul>
          {items.slice(0, 8).map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2.5 border-b border-edge/70 py-2.5 last:border-0 last:pb-0"
            >
              <span className="tile h-7 w-7 shrink-0 overflow-hidden">
                <Favicon
                  src={item.faviconUrl ?? null}
                  url={item.url ?? ""}
                  name={item.displayName}
                  size={15}
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                {item.displayName}
              </span>
              <span className="denom shrink-0 text-[15px] font-semibold">
                {formatUsd(item.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
"""

FILES['src/components/CategoryPills.tsx'] = r"""import Link from "next/link";
import { CATEGORIES } from "@/lib/config";

/**
 * Horizontal scroll rather than wrapping — 23 categories wrapped into four
 * rows on a phone and pushed the board off the screen.
 */
export function CategoryPills({
  active,
  available,
}: {
  active?: string;
  /** Slugs with at least one listing. Empty filters make a young board look
   *  emptier than it is; when omitted, every category renders. */
  available?: string[];
}) {
  const visible = available
    ? CATEGORIES.filter((c) => available.includes(c.slug) || c.slug === active)
    : CATEGORIES;

  return (
    <nav
      aria-label="Categories"
      className="-mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <Chip href="/" label="All" active={!active} />
      {visible.map((c) => (
        <Chip
          key={c.slug}
          href={`/category/${c.slug}`}
          label={c.label}
          active={active === c.slug}
        />
      ))}
    </nav>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`chip shrink-0 snap-start ${active ? "chip-on" : ""}`}
    >
      {label}
    </Link>
  );
}
"""

FILES['src/components/ClaimPanel.tsx'] = r""""use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/config";
import { formatUsd } from "@/lib/format";

type Preview = {
  url: string;
  displayName: string;
  onBoard: boolean;
  currentBidCents: number;
  minimumCents: number;
};

/**
 * The hero is the price itself, lit from behind, with the two controls that
 * change it either side. Everything else on this screen is caption. The meter
 * underneath splits into the money the leader has already paid and the money
 * you are stacking on top of it, so pressing + shows the overtake happen
 * rather than describing it.
 */
export function ClaimPanel({
  priceForFirst,
  enabled,
  leader,
}: {
  priceForFirst: number;
  enabled: boolean;
  /** Who holds #1 right now — the fight the page is selling. */
  leader?: { name: string; cents: number } | null;
}) {
  const [submission, setSubmission] = useState("");
  const [category, setCategory] = useState("other");
  const [amountCents, setAmountCents] = useState(priceForFirst);
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  //"take it" links from the board land here with an amount.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("amount");
    const dollars = Math.floor(Number(wanted));
    if (dollars > 0) setAmountCents(dollars * 100);
  }, []);

  // Resolve the link as they type so they see what they're actually listing.
  useEffect(() => {
    const value = submission.trim();
    if (value.length < 4) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission: value }),
        });
        setPreview(res.ok ? ((await res.json()) as Preview) : null);
      } catch {
        setPreview(null);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [submission]);

  const minimum = preview?.onBoard ? preview.minimumCents : 100;
  const belowMinimum = amountCents < minimum;
  const takesTop = amountCents >= priceForFirst;

  function step(deltaCents: number) {
    setAmountCents((c) => Math.max(minimum, c + deltaCents));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission,
          category,
          bidDollars: Math.floor(amountCents / 100),
          email: email || undefined,
        }),
      });
      const data = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Couldn't open checkout. Try again.");
        setPending(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Check your connection and try again.");
      setPending(false);
    }
  }

  const ahead = leader ? amountCents > leader.cents : true;
  const ceiling = Math.max(amountCents, leader?.cents ?? 0, 1);
  const leaderPct = leader ? (leader.cents / ceiling) * 100 : 0;
  const yourPct = (amountCents / ceiling) * 100;

  return (
    <section id="bid" className="relative scroll-mt-24 text-center">
      <p className="label">
        {leader ? "Your bid" : "What the first listing costs"}
      </p>

      <div className="mt-5 flex items-center justify-center gap-4 sm:gap-7">
        <button
          type="button"
          onClick={() => step(-100)}
          disabled={amountCents <= minimum}
          className="step h-12 w-12 shrink-0 text-2xl font-light sm:h-14 sm:w-14"
          aria-label="Lower the bid by one dollar"
        >
          &minus;
        </button>

        <span
          className="denom min-w-0 text-[clamp(3rem,12vw,6rem)]"
          style={{ "--lum": 1 } as React.CSSProperties}
        >
          {formatUsd(amountCents)}
        </span>

        <button
          type="button"
          onClick={() => step(100)}
          className="step h-12 w-12 shrink-0 text-2xl font-light sm:h-14 sm:w-14"
          aria-label="Raise the bid by one dollar"
        >
          +
        </button>
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-edge/70">
          {leader ? (
            <>
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-edge transition-[width] duration-300 ease-out"
                style={{ width: `${ahead ? leaderPct : yourPct}%` }}
              />
              {ahead ? (
                <div
                  className="absolute inset-y-0 right-0 rounded-full bg-ink transition-all duration-300 ease-out"
                  style={{ left: `${leaderPct}%` }}
                />
              ) : null}
            </>
          ) : (
            <div className="absolute inset-0 bg-ink" />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-[14px] leading-relaxed">
          {leader ? (
            <>
              <p className="text-dim">
                <span className="font-bold text-ink">{leader.name}</span> holds
                it at{""}
                <span className="tnum font-bold text-ink">
                  {formatUsd(leader.cents)}
                </span>
                {ahead
                  ? ". Anything above that takes the spot."
                  : ". This bid lands further down the board."}
              </p>
              {ahead ? (
                <span className="tnum rounded-full bg-accentwash px-2.5 py-1 text-[11px] font-bold tracking-[0.01em] text-ink">
                  You +{formatUsd(amountCents - leader.cents)}
                </span>
              ) : null}
            </>
          ) : (
            <p className="text-dim">
              The board is empty. One dollar opens it at #1.
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-9 max-w-3xl text-left"
      >
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto]">
          <label className="block">
            <span className="sr-only">Product URL or @handle</span>
            <input
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="yourproduct.com or @handle"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              required
              className="field"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="field appearance-none pr-9"
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dim"
              width="11"
              height="7"
              viewBox="0 0 11 7"
              fill="none"
              aria-hidden
            >
              <path
                d="M1 1l4.5 4.5L10 1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </label>

          <button
            type="submit"
            disabled={!enabled || pending || belowMinimum || !submission}
            className="btn btn-ink w-full px-9 py-4 md:w-auto"
          >
            {!enabled
              ? "Soon"
              : pending
                ? "Opening"
                : takesTop
                  ? "Take #1"
                  : "Place bid"}
          </button>
        </div>

        <label className="mt-2 block">
          <span className="sr-only">Email for the receipt</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email for your receipt (optional)"
            autoComplete="email"
            autoCapitalize="none"
            className="field py-3"
          />
        </label>

        <p className="mt-3 min-h-[2.5rem] text-center text-[13px] leading-relaxed text-dim">
          {!enabled ? (
            "Bidding opens as soon as payment setup is finished."
          ) : error ? (
            <span className="font-semibold text-ink">{error}</span>
          ) : belowMinimum ? (
            <span className="font-semibold text-ink">
              {preview?.onBoard
                ? `That link already holds ${formatUsd(preview.currentBidCents)}. Bid at least ${formatUsd(minimum)} to move it up.`
                : "The minimum bid is $1."}
            </span>
          ) : preview?.onBoard ? (
            <>
              <span className="font-bold text-ink">{preview.displayName}</span>
              {""}
              is already on the board at{""}
              {formatUsd(preview.currentBidCents)}. Bidding again raises it to
              {""}
              {formatUsd(amountCents)}.
            </>
          ) : (
            "One payment, no subscription. Already listed? Enter the same link to raise your bid."
          )}
        </p>
      </form>
    </section>
  );
}
"""

FILES['src/components/ClickTicker.tsx'] = r""""use client";

import { useEffect, useState } from "react";

type ClickItem = {
  id: string;
  displayName: string;
  faviconUrl: string | null;
  createdAt: string;
};

/**
 * Real outbound clicks, one at a time, directly under the masthead — proof
 * that the money buys something. The server only returns events from the last
 * 24 hours, so a quiet board renders no band at all; a stale ticker reads
 * worse than none.
 */
export function ClickTicker({ initial }: { initial: ClickItem[] }) {
  const [items, setItems] = useState(initial);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const refresh = setInterval(async () => {
      try {
        const res = await fetch("/api/activity");
        if (!res.ok) return;
        const data = (await res.json()) as { clicks?: ClickItem[] };
        if (Array.isArray(data.clicks)) setItems(data.clicks);
      } catch {
        // Keep rotating what we have.
      }
    }, 30_000);
    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const rotate = setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      4_500,
    );
    return () => clearInterval(rotate);
  }, [items.length]);

  const item = items[index % Math.max(1, items.length)];
  if (!item) return null;

  return (
    <div className="relative z-30 border-b border-edge bg-wash" aria-live="off">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
          aria-hidden
        />
        <p
          key={item.id}
          className="min-w-0 truncate text-[13px] font-medium text-dim"
        >
          <span className="text-ink">{item.displayName}</span> got a click
        </p>
      </div>
    </div>
  );
}
"""

FILES['src/components/CopyBox.tsx'] = r""""use client";

import { useState } from "react";

/** A code snippet with a copy button. Used for the embeddable badge. */
export function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the snippet is selectable below.
    }
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-edge bg-wash px-3.5 py-3 pr-24 text-left font-mono text-[11px] leading-relaxed text-dim">
        {value}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="btn btn-quiet absolute right-2 top-2 px-3 py-1.5 text-[12px]"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
"""

FILES['src/components/EntryRow.tsx'] = r"""import Link from "next/link";
import { Favicon } from "@/components/Favicon";
import { categoryLabel } from "@/lib/config";
import { formatCompact, formatUsd } from "@/lib/format";
import { priceToBeat, type RankedEntry } from "@/lib/queries";

/**
 * A row of the register. The table is the plain, complete account of the board
 * behind the object at the top of the page: index, listing, category, clicks
 * delivered, standing bid, and the one button that takes it off them.
 *
 * There is deliberately no date on a row. When something was listed has no
 * bearing on where it sits; only the number does.
 */
export function EntryRow({ entry }: { entry: RankedEntry }) {
  const rank = Number(entry.rank);
  const takeFor = priceToBeat(entry.bidCents);

  return (
    <li className="sheet-row">
      <div className="flex items-center gap-3 px-4 py-4 sm:gap-5 sm:px-5">
        <span
          className="tnum hidden w-7 shrink-0 font-mono text-[13px] text-dim sm:block"
          aria-hidden
        >
          {String(rank).padStart(2, "0")}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Favicon
            src={entry.faviconUrl}
            url={entry.url}
            name={entry.displayName}
            size={32}
            className="tile h-8 w-8 shrink-0 object-contain p-1"
          />
          <div className="min-w-0">
            <a
              href={`/r/${entry.id}`}
              target="_blank"
              rel="noopener nofollow sponsored"
              className="block truncate text-[15px] font-semibold leading-snug tracking-[-0.01em] transition hover:text-accent"
            >
              {entry.displayName}
              {entry.title ? (
                <span className="font-normal text-dim"> · {entry.title}</span>
              ) : null}
            </a>
            {entry.description ? (
              <p className="mt-0.5 truncate text-[13px] leading-relaxed text-dim">
                {entry.description}
              </p>
            ) : null}
          </div>
        </div>

        <span className="label hidden w-40 shrink-0 truncate lg:block">
          {categoryLabel(entry.category)}
        </span>

        <span className="hidden w-24 shrink-0 text-[13px] text-dim md:block">
          <span className="tnum text-ink">{formatCompact(entry.clicks)}</span>{" "}
          clicks
        </span>

        <span className="denom w-16 shrink-0 text-right text-[17px] font-semibold">
          {formatUsd(entry.bidCents)}
        </span>

        <span className="flex shrink-0 items-center gap-1">
          <Link
            href={`/l/${entry.id}`}
            aria-label={`Share page for ${entry.displayName}`}
            className="hidden rounded-lg p-2 text-dim transition hover:bg-wash hover:text-ink sm:block"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </Link>

          <Link
            href={`/?amount=${takeFor / 100}#bid`}
            className="btn btn-ink px-4 py-2 text-[13px]"
          >
            Outbid
          </Link>
        </span>
      </div>
    </li>
  );
}
"""

FILES['src/components/Favicon.tsx'] = r""""use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { faviconProxy, hostOf } from "@/lib/favicon";

/**
 * Product icon with a fallback chain: the stored icon, then Google's proxy
 * for the domain, then a letter tile. A broken image never renders — old
 * rows with dead icon URLs heal themselves at view time.
 */
export function Favicon({
  src,
  url,
  name,
  className,
  size = 44,
}: {
  src: string | null;
  url: string;
  name: string;
  className?: string;
  size?: number;
}) {
  const host = hostOf(url);
  const chain = [src, host ? faviconProxy(host) : null].filter(
    (u): u is string => Boolean(u),
  );
  const [step, setStep] = useState(0);

  if (step >= chain.length) {
    return (
      <span
        className={`flex items-center justify-center font-bold text-dim ${className ?? ""}`}
        style={{ fontSize: Math.max(12, Math.floor(size * 0.42)) }}
        aria-hidden
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={chain[step]}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setStep((n) => n + 1)}
      className={className}
    />
  );
}
"""

FILES['src/components/LegalPage.tsx'] = r"""import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

/** Shared shell so the policy pages stay visually identical. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <h1 className="mt-10 text-[40px] font-bold leading-none tracking-[-0.02em]">
        {title}
      </h1>
      <p className="mt-4 text-[10px] font-semibold tracking-[0.01em] text-dim">
        Last updated {updated}
      </p>

      <div className="mt-10 space-y-8 pt-8">{children}</div>
    </main>
  );
}

export function Clause({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[20px] font-bold tracking-[-0.02em]">{heading}</h2>
      <div className="mt-2.5 space-y-2.5 text-[14px] leading-relaxed text-dim">
        {children}
      </div>
    </section>
  );
}
"""

FILES['src/components/LiveCount.tsx'] = r""""use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "buyrank_visitor";
const HEARTBEAT_MS = 60_000;

/** Random, anonymous, generated in the browser. Not derived from anything. */
function visitorToken(): string {
  const make = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  };
  const valid = (t: string | null): t is string =>
    Boolean(t && /^[0-9a-f]{32}$/.test(t));

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (valid(existing)) return existing;
    const token = make();
    localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    // localStorage blocked (private browsing). sessionStorage usually still
    // works, and without it every page load minted a new token — which
    // quietly inflated"visitors since launch". One token per tab is honest.
    try {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (valid(existing)) return existing;
      const token = make();
      sessionStorage.setItem(STORAGE_KEY, token);
      return token;
    } catch {
      return make();
    }
  }
}

export function LiveCount({
  initialOnline,
  initialTotal,
}: {
  /** Server-rendered starting values, so a refresh never blanks the pill. */
  initialOnline: number;
  initialTotal: number;
}) {
  // State is kept (not read) so the heartbeat response still has somewhere to
  // land if the display block is restored.
  const [, setCounts] = useState<{ online: number; total: number }>({
    online: initialOnline,
    total: initialTotal,
  });

  useEffect(() => {
    const id = visitorToken();
    let cancelled = false;

    async function beat() {
      try {
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { online: number; total: number };
        if (!cancelled) setCounts(data);
      } catch {
        // Offline or blocked. Leave the last known numbers alone.
      }
    }

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Renders nothing on purpose: the online count is hidden while the numbers
  // are small. The heartbeat above still runs, so presence keeps accruing and
  // the count is available on /api/stats — restore the block below to show it.
  //
  //   <span className="flex items-center gap-1.5">
  //     <span className="blink h-1.5 w-1.5 rounded-full bg-mint" aria-hidden />
  //     <span className="tnum font-semibold text-mint">
  //       {counts.online.toLocaleString("en-US")} online
  //     </span>
  //   </span>
  //   <span aria-hidden>&middot;</span>
  return null;
}
"""

FILES['src/components/Masthead.tsx'] = r"""import Link from "next/link";
import { MIN_PAID_STAT_CENTS, SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import type { BoardStats } from "@/lib/queries";
import { LiveCount } from "./LiveCount";

/**
 * A thin white bar with one hairline under it. The only figure it carries is
 * the total that has changed hands, held back until that number argues for the
 * board rather than against it.
 */
export function Masthead({ stats }: { stats: BoardStats }) {
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:gap-6 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink font-display text-[14px] font-semibold leading-none text-paper">
            {SITE_NAME.charAt(0).toUpperCase()}
          </span>
          <span className="font-display text-[17px] font-semibold leading-none tracking-[-0.02em]">
            {SITE_NAME}
          </span>
        </Link>

        <span className="hidden text-[13px] text-dim lg:block">
          Rank is bought, not earned
        </span>

        <div className="ml-auto flex items-center gap-5 sm:gap-7">
          {stats.totalCents >= MIN_PAID_STAT_CENTS ? (
            <p className="hidden items-baseline gap-1.5 text-[13px] sm:flex">
              <span className="denom font-semibold">
                {formatUsd(stats.totalCents)}
              </span>
              <span className="text-dim">raised</span>
            </p>
          ) : null}

          <nav className="flex items-center gap-5 text-[13px] text-dim">
            <Link href="/rules" className="transition hover:text-ink">
              Rules
            </Link>
            <Link href="/about" className="transition hover:text-ink">
              About
            </Link>
          </nav>
        </div>
      </div>

      {/* Presence keeps accruing; the component itself renders nothing. */}
      <LiveCount
        initialOnline={stats.onlineNow}
        initialTotal={stats.totalVisitors}
      />
    </header>
  );
}
"""

FILES['src/components/Pagination.tsx'] = r"""import Link from "next/link";

export function Pagination({
  page,
  pages,
  basePath,
}: {
  page: number;
  pages: number;
  basePath: string;
}) {
  if (pages <= 1) return null;

  const near = [page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages);
  const shown = Array.from(new Set([1, ...near, pages])).sort((a, b) => a - b);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center gap-1.5"
    >
      {shown.map((p, i) => {
        const gap = i > 0 && p - shown[i - 1] > 1;
        return (
          <span key={p} className="flex items-center gap-1.5">
            {gap ? <span className="px-1 text-[11px] text-dim">…</span> : null}
            <Link
              href={p === 1 ? basePath : `${basePath}?page=${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`chip tnum justify-center px-3 ${p === page ? "chip-on" : ""}`}
            >
              {p}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
"""

FILES['src/components/SetupNotice.tsx'] = r"""import Link from "next/link";

/**
 * Database problems we can name. Anything else is rethrown — hiding a real bug
 * behind a friendly screen is worse than a stack trace.
 */
const KNOWN = {
  "42P01": {
    title: "The database tables don't exist yet",
    detail:
      "The connection works, but the schema was never created — db:push didn't finish.",
    fix: "npm run db:push",
  },
  "28P01": {
    title: "The database rejected your password",
    detail:
      "The host is reachable but the credentials are wrong. If you rotated the password, update DATABASE_URL.",
    fix: "npm run db:check",
  },
  "28000": {
    title: "The database rejected your login",
    detail:
      "On Supabase the pooler username includes the project ref — postgres.yourprojectref, not just postgres.",
    fix: "npm run db:check",
  },
  "3D000": {
    title: "That database doesn't exist",
    detail: "The server answered, but there's no database with that name.",
    fix: "npm run db:check",
  },
  ENOTFOUND: {
    title: "The database host can't be found",
    detail:
      "Check the hostname in DATABASE_URL. On Supabase use a pooler string — the direct db.xxx.supabase.co host is IPv6-only and most networks can't reach it.",
    fix: "npm run db:check",
  },
  ENETUNREACH: {
    title: "The database host is unreachable",
    detail:
      "This is what an IPv6-only Supabase direct connection looks like from an IPv4 network. Use the pooler string instead.",
    fix: "npm run db:check",
  },
  ECONNREFUSED: {
    title: "The database refused the connection",
    detail: "Nothing is listening on that host and port.",
    fix: "npm run db:check",
  },
  CONNECT_TIMEOUT: {
    title: "The database didn't answer in time",
    detail:
      "Usually a wrong port or a firewall. Supabase uses 6543 for the transaction pooler and 5432 for the session pooler.",
    fix: "npm run db:check",
  },
} as const;

export function databaseErrorCode(error: unknown): string | null {
  let current: unknown = error;
  // Drizzle wraps the driver error, so walk the cause chain.
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && code in KNOWN) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

export function SetupNotice({ code }: { code: string }) {
  const issue = KNOWN[code as keyof typeof KNOWN];
  if (!issue) return null;

  return (
    <main className="mx-auto max-w-xl px-5 py-24">
      <p className="text-[11px] tracking-[0.01em] text-accent">
        Setup incomplete
      </p>
      <h1 className="mt-4 text-[38px] font-bold leading-tight tracking-[-0.02em] text-ink">
        {issue.title}
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-dim">
        {issue.detail}
      </p>

      <p className="mt-8 text-[11px] tracking-[0.01em] text-dim">Run this</p>
      <pre className="mt-2 overflow-x-auto rounded bg-wash px-4 py-3.5 text-sm">
        <code className="tnum text-accent">{issue.fix}</code>
      </pre>

      <p className="mt-10 border-t border-edge pt-6 text-sm text-dim">
        This screen only appears in development, and only for database problems
        that can be named.{""}
        <Link
          href="/rules"
          className="text-accent underline underline-offset-4"
        >
          Rules
        </Link>
      </p>
    </main>
  );
}
"""

FILES['src/components/ShareRow.tsx'] = r""""use client";

import { useState } from "react";

/** X / WhatsApp / copy — the three places this audience actually shares. */
export function ShareRow({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the link is visible on the page anyway.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={x}
        target="_blank"
        rel="noopener"
        className="btn btn-quiet py-2.5"
      >
        Post on X
      </a>
      <a
        href={wa}
        target="_blank"
        rel="noopener"
        className="btn btn-quiet py-2.5"
      >
        WhatsApp
      </a>
      <button type="button" onClick={copy} className="btn btn-quiet py-2.5">
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
"""

FILES['src/components/SponsorSlot.tsx'] = r""""use client";

import { useEffect, useState } from "react";
import { Favicon } from "@/components/Favicon";
import { SPONSOR_MAX_DAYS, type SponsorTier } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import type { AllSponsorStates, SponsorState } from "@/lib/queries";

/** "6h 6m left" — under an hour it switches to minutes only. */
function timeLeft(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "ending now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m left`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
}

/**
 * A placement card in the rail beside the object: a slot, its price, and the
 * one action. Rented, it shows whose mark is in it and how long the rental has
 * left. Open, it is an offer rather than a placeholder.
 */
export function SponsorSlot({
  tier,
  index,
  initial,
  enabled,
}: {
  tier: SponsorTier;
  /** Which slot this is in the rail, for the heading. */
  index: number;
  initial: SponsorState;
  enabled: boolean;
}) {
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [days, setDays] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Countdown ticks locally; the state itself refreshes on a slow poll.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const refresh = setInterval(async () => {
      try {
        const res = await fetch("/api/sponsor");
        if (!res.ok) return;
        const data = (await res.json()) as { tiers?: AllSponsorStates };
        const next = data.tiers?.[tier.id];
        if (next) setState(next);
      } catch {
        // Keep showing the last known state.
      }
    }, 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [tier.id]);

  async function rent(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "sponsor",
          submission: url,
          days,
          tier: tier.id,
        }),
      });
      const data = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Couldn't start checkout.");
        setPending(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Couldn't start checkout. Try again in a moment.");
      setPending(false);
    }
  }

  const current = state.current;
  const rented = current && new Date(current.endsAt).getTime() > now;

  return (
    <section className="card p-4" aria-label={`${tier.label} placement`}>
      <div className="flex items-center gap-3">
        <span className="tile h-10 w-10 shrink-0 overflow-hidden">
          {rented ? (
            <Favicon
              src={current.faviconUrl}
              url={current.url}
              name={current.displayName}
              size={22}
            />
          ) : (
            <span className="text-[18px] font-light leading-none">+</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[16px] font-semibold tracking-[-0.01em]">
            {rented ? current.displayName : `Slot #${index}`}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-dim">
            {rented ? timeLeft(current.endsAt, now) : tier.label}
          </p>
        </div>
      </div>

      {rented ? (
        <p className="mt-4 flex items-center justify-between gap-2 text-[13px] text-dim">
          <span className="tnum">
            <span className="text-ink">
              {current.windowClicks.toLocaleString("en-US")}
            </span>{" "}
            clicks
          </span>
          <a
            href={`/r/${current.entryId}`}
            target="_blank"
            rel="noopener nofollow sponsored"
            className="btn btn-quiet px-3 py-1.5 text-[13px]"
          >
            Visit
          </a>
        </p>
      ) : !open ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="tnum text-[13px] text-dim">
            <span className="text-ink">{formatUsd(tier.priceCentsPerDay)}</span>{" "}
            · 1 day
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!enabled}
            className="btn btn-claim px-3.5 py-1.5 text-[13px]"
          >
            {enabled ? "Claim →" : "Soon"}
          </button>
        </div>
      ) : (
        <form onSubmit={rent} className="mt-4">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourproject.com"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="field py-2 text-[14px]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Fewer days"
                onClick={() => setDays((d) => Math.max(1, d - 1))}
                className="step h-7 w-7 text-[14px]"
              >
                &minus;
              </button>
              <span className="tnum min-w-[3.5ch] text-center text-[13px]">
                {days}d
              </span>
              <button
                type="button"
                aria-label="More days"
                onClick={() =>
                  setDays((d) => Math.min(SPONSOR_MAX_DAYS, d + 1))
                }
                className="step h-7 w-7 text-[14px]"
              >
                +
              </button>
            </div>
            <span className="denom text-[16px] font-semibold">
              {formatUsd(days * tier.priceCentsPerDay)}
            </span>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn btn-ink mt-2.5 w-full py-2 text-[13px]"
          >
            {pending ? "Opening…" : "Continue to payment"}
          </button>
          {error ? (
            <p className="mt-2 text-[12px] text-accent">{error}</p>
          ) : null}
        </form>
      )}
    </section>
  );
}
"""

FILES['src/components/Staircase.tsx'] = r"""import Link from "next/link";
import { faviconProxy, hostOf } from "@/lib/favicon";
import { formatUsd } from "@/lib/format";
import { priceToBeat, type RankedEntry } from "@/lib/queries";

/** How many steps the flight has. The rest of the board lives in the table. */
export const STAIRCASE_STEPS = 8;

/* --- The solid ------------------------------------------------------------
 *
 * The product photographed, except there is no product: an eight-step flight
 * defined in three dimensions and projected to the screen, standing on white
 * like an object on a studio sweep. Every step is a rank somebody can buy, and
 * a taken step wears its owner's mark on the tread the way a sticker sits on a
 * surface.
 *
 * Axes: x runs up the flight, y across its width, z is height. The camera sits
 * high and off one corner, so the visible planes are the tread, the riser and
 * the side wall — shaded light, mid and dark, as one white object lit from
 * above. The flight descends toward the viewer, so no step can hide the one
 * behind it and the solid paints back to front with no depth sorting.
 */

const K = Math.cos(Math.PI / 6); // horizontal spread of the ground plane
const M = 0.38; // vertical squash — how high above the flight the camera sits
const RUN = 64; // tread depth
const WIDTH = 185; // step width
const RISE = 40; // step height

type P3 = [number, number, number];

function project([x, y, z]: P3): [number, number] {
  return [(x - y) * K, (x + y) * M - z];
}

function poly(points: P3[]): string {
  return points.map((p) => project(p).join(",")).join(" ");
}

/**
 * An SVG matrix that lays flat content onto a face of the solid. `u` and `v`
 * are the 3D vectors one local unit travels along, so ordinary 2D drawing
 * inside the group lands on the face already skewed into the projection.
 */
function onFace(origin: P3, u: P3, v: P3): string {
  const o = project(origin);
  const pu = project([origin[0] + u[0], origin[1] + u[1], origin[2] + u[2]]);
  const pv = project([origin[0] + v[0], origin[1] + v[1], origin[2] + v[2]]);
  return `matrix(${pu[0] - o[0]},${pu[1] - o[1]},${pv[0] - o[0]},${pv[1] - o[1]},${o[0]},${o[1]})`;
}

export function Staircase({ rows }: { rows: RankedEntry[] }) {
  const steps = Array.from({ length: STAIRCASE_STEPS }, (_, j) => {
    const position = j + 1;
    const x0 = j * RUN;
    return {
      position,
      x0,
      x1: x0 + RUN,
      height: (STAIRCASE_STEPS - j) * RISE,
      entry: rows[j],
    };
  });

  // Fit the viewBox to the solid rather than guessing at it.
  const pts = steps
    .flatMap(({ x0, x1, height }): P3[] => [
      [x0, 0, 0],
      [x1, 0, 0],
      [x0, WIDTH, 0],
      [x1, WIDTH, 0],
      [x0, 0, height],
      [x1, WIDTH, height],
    ])
    .map(project);
  const pad = 40;
  const minX = Math.min(...pts.map((p) => p[0])) - pad;
  const maxX = Math.max(...pts.map((p) => p[0])) + pad;
  const minY = Math.min(...pts.map((p) => p[1])) - pad;
  const maxY = Math.max(...pts.map((p) => p[1])) + pad + 30;

  return (
    <figure className="relative">
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        className="w-full select-none"
        role="group"
        aria-label="The flight. Every step on it is for sale."
      >
        <defs>
          {/* The sweep the object stands on, and the shadow it casts onto it. */}
          <filter id="cast" x="-40%" y="-70%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <linearGradient id="sheen" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon
          points={poly([
            [-10, -10, 0],
            [STAIRCASE_STEPS * RUN + 26, -10, 0],
            [STAIRCASE_STEPS * RUN + 26, WIDTH + 26, 0],
            [-10, WIDTH + 26, 0],
          ])}
          filter="url(#cast)"
          style={{ fill: "rgb(var(--ink-rgb))", opacity: 0.13 }}
        />

        {steps.map(({ position, x0, x1, height, entry }) => {
          const cost = entry ? priceToBeat(entry.bidCents) : 100;
          const host = entry ? hostOf(entry.url) : null;
          const icon = entry
            ? (entry.faviconUrl ?? (host ? faviconProxy(host) : null))
            : null;

          const tread: P3[] = [
            [x0, 0, height],
            [x1, 0, height],
            [x1, WIDTH, height],
            [x0, WIDTH, height],
          ];
          const riser: P3[] = [
            [x1, 0, height],
            [x1, WIDTH, height],
            [x1, WIDTH, height - RISE],
            [x1, 0, height - RISE],
          ];
          const wall: P3[] = [
            [x0, WIDTH, height],
            [x1, WIDTH, height],
            [x1, WIDTH, 0],
            [x0, WIDTH, 0],
          ];

          // The slot: a panel let into the tread, sized like a real one.
          const slotW = 46;
          const slotH = 34;
          const onTread = onFace(
            [x0 + (RUN - slotW) / 2, WIDTH / 2 - slotH / 2, height],
            [1, 0, 0],
            [0, 1, 0],
          );
          const onRiser = onFace(
            [x1, WIDTH - 16, height],
            [0, -1, 0],
            [0, 0, -1],
          );
          const tag = project([x1 - RUN / 2, WIDTH / 2, height]);

          return (
            <Link
              key={position}
              href={`/?amount=${cost / 100}#bid`}
              className="step3d"
              aria-label={
                entry
                  ? `Outbid ${entry.displayName} for step ${position} at ${formatUsd(cost)}`
                  : `Claim the available step ${position} for ${formatUsd(cost)}`
              }
            >
              <g
                className="climb"
                style={{ "--i": position } as React.CSSProperties}
              >
                <g className="step3d-lift">
                  <title>
                    {entry
                      ? `${entry.displayName} holds step ${position} at ${formatUsd(entry.bidCents)}`
                      : `Step ${position} is available`}
                  </title>

                  {/* One white object, three planes, lit from above. */}
                  <polygon
                    points={poly(wall)}
                    fill="#dbdbdb"
                    style={{ fill: "rgb(var(--face3-rgb))" }}
                    stroke="rgb(var(--face3-rgb))"
                    strokeWidth={6}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={poly(riser)}
                    fill="#e9e9e9"
                    style={{ fill: "rgb(var(--face2-rgb))" }}
                    stroke="rgb(var(--face2-rgb))"
                    strokeWidth={6}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={poly(tread)}
                    fill="#f7f7f7"
                    style={{ fill: "rgb(var(--face1-rgb))" }}
                    stroke="rgb(var(--face1-rgb))"
                    strokeWidth={6}
                    strokeLinejoin="round"
                  />
                  <polygon points={poly(tread)} fill="url(#sheen)" />
                  <polygon
                    className="step3d-hl"
                    points={poly(tread)}
                    style={{ fill: "rgb(var(--accent-rgb))", opacity: 0.12 }}
                  />

                  {/* The slot cut into the tread. */}
                  <g transform={onTread}>
                    <rect
                      width={slotW}
                      height={slotH}
                      rx={5}
                      fill="#ffffff"
                      style={{
                        fill: entry
                          ? "rgb(var(--paper-rgb))"
                          : "rgb(var(--face2-rgb))",
                        stroke: "rgb(var(--edge-rgb))",
                        strokeWidth: 1,
                      }}
                    />
                    {entry ? (
                      <>
                        <text
                          x={slotW / 2}
                          y={slotH / 2 + 6}
                          textAnchor="middle"
                          style={{
                            fill: "rgb(var(--dim-rgb))",
                            fontSize: 16,
                            fontWeight: 600,
                          }}
                        >
                          {entry.displayName.charAt(0).toUpperCase()}
                        </text>
                        {icon ? (
                          <image
                            href={icon}
                            x={slotW / 2 - 11}
                            y={slotH / 2 - 11}
                            width={22}
                            height={22}
                            preserveAspectRatio="xMidYMid meet"
                          />
                        ) : null}
                      </>
                    ) : (
                      <text
                        x={slotW / 2}
                        y={slotH / 2 + 3}
                        textAnchor="middle"
                        className="font-mono"
                        style={{
                          fill: "rgb(var(--dim-rgb))",
                          fontSize: 6.5,
                          letterSpacing: "0.12em",
                        }}
                      >
                        AVAILABLE
                      </text>
                    )}
                  </g>

                  {/* Printed on the riser. */}
                  <g transform={onRiser}>
                    <text
                      x={0}
                      y={26}
                      className="font-display"
                      style={{
                        fill: entry
                          ? "rgb(var(--ink-rgb))"
                          : "rgb(var(--dim-rgb))",
                        fontSize: 18,
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {entry ? formatUsd(entry.bidCents) : formatUsd(cost)}
                    </text>
                    <text
                      x={WIDTH - 44}
                      y={26}
                      textAnchor="end"
                      className="font-mono"
                      style={{
                        fill: "rgb(var(--dim-rgb))",
                        fontSize: 12,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {String(position).padStart(2, "0")}
                    </text>
                  </g>

                  {/* The offer, on whichever step is under the cursor. */}
                  <g
                    className="step3d-tag"
                    transform={`translate(${tag[0]}, ${tag[1] - 22})`}
                  >
                    <rect
                      x={-49}
                      y={-14}
                      width={98}
                      height={26}
                      rx={8}
                      style={{ fill: "rgb(var(--ink-rgb))" }}
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      style={{
                        fill: "rgb(var(--paper-rgb))",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {entry ? "Outbid" : "Claim"} {formatUsd(cost)}
                    </text>
                  </g>
                </g>
              </g>
            </Link>
          );
        })}
      </svg>
    </figure>
  );
}
"""

FILES['src/components/SuccessRank.tsx'] = r""""use client";

import { useEffect, useState } from "react";
import { ShareRow } from "@/components/ShareRow";

type RankResult = {
  found: boolean;
  id?: string;
  rank?: number;
  displayName?: string;
};

/**
 * Right after checkout the webhook may still be in flight, so this polls the
 * rank for up to 30 seconds and then shows the spot the buyer just took —
 * which is the exact moment they're most willing to share it.
 */
export function SuccessRank({
  name,
  siteName,
  siteUrl,
}: {
  name: string;
  siteName: string;
  siteUrl: string;
}) {
  const [result, setResult] = useState<RankResult | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function poll() {
      tries += 1;
      try {
        const res = await fetch(`/api/rank?u=${encodeURIComponent(name)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as RankResult;
          if (cancelled) return;
          if (data.found) {
            setResult(data);
            return;
          }
        }
      } catch {
        // Fall through to retry.
      }
      if (cancelled) return;
      if (tries >= 10) {
        setGaveUp(true);
        return;
      }
      setTimeout(poll, 3000);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (result?.found && result.rank && result.id) {
    return (
      <div className="mt-8 pt-8">
        <p className="label">Position taken</p>
        <p
          className="denom mt-3 text-[clamp(3.4rem,13vw,6rem)]"
          style={{ "--lum": 1 } as React.CSSProperties}
        >
          #{result.rank}
        </p>
        <p className="mt-3 text-[15px]">
          <span className="font-semibold">{result.displayName}</span>
          {""}
          <span className="text-dim">is live at #{result.rank}.</span>
        </p>
        <div className="mt-6">
          <ShareRow
            url={`${siteUrl}/l/${result.id}`}
            text={`${result.displayName} just took #${result.rank} on ${siteName}. Outbid it if you dare.`}
          />
        </div>
      </div>
    );
  }

  return (
    <p
      className="mt-6 text-[11px] font-semibold tracking-[0.01em] text-dim"
      aria-live="polite"
    >
      {gaveUp
        ? "Payments can take a minute to clear. Your listing appears the moment it does."
        : "Confirming your spot…"}
    </p>
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
