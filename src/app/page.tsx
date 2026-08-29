import { CategoryPills } from "@/components/CategoryPills";
import { EntryRow } from "@/components/EntryRow";
import { ClaimPanel } from "@/components/ClaimPanel";
import { Masthead } from "@/components/Masthead";
import { Pagination } from "@/components/Pagination";
import { ActivityStrip } from "@/components/ActivityStrip";
import { ClickTicker } from "@/components/ClickTicker";
import { SponsorSlot } from "@/components/SponsorSlot";
import { Staircase } from "@/components/Staircase";
import { ViewBeacon } from "@/components/ViewBeacon";
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

      {/* Counts this board as shown, once per session, after the tab is
          actually visible. Renders nothing. */}
      <ViewBeacon ids={board.rows.map((r) => r.id)} />

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
                <span className="label hidden w-28 shrink-0 md:block">
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
