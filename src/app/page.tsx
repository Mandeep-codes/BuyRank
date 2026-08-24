import { CategoryPills } from "@/components/CategoryPills";
import { EntryRow } from "@/components/EntryRow";
import { ClaimPanel } from "@/components/ClaimPanel";
import { Masthead } from "@/components/Masthead";
import { Pagination } from "@/components/Pagination";
import { ActivityStrip } from "@/components/ActivityStrip";
import { ClickTicker } from "@/components/ClickTicker";
import { SponsorSlot } from "@/components/SponsorSlot";
import { SetupNotice, databaseErrorCode } from "@/components/SetupNotice";
import { PAGE_SIZE } from "@/lib/config";
import { paymentsConfigured } from "@/lib/dodo";
import {
  cachedActivity,
  cachedBoard,
  cachedCategories,
  cachedClicks,
  cachedSponsor,
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

  let board, stats, activity, clicks, sponsor, categories;

  try {
    [board, stats, activity, clicks, sponsor, categories] = await Promise.all([
      cachedBoard(page, null),
      cachedStats(),
      cachedActivity(),
      cachedClicks(),
      cachedSponsor(),
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
  // Who holds #1 — the hero names the fight instead of an abstract claim.
  const top = board.rows[0];
  // postgres returns window-function output as a string; compare loosely-cast.
  const leader =
    page === 1 && top && Number(top.rank) === 1
      ? { name: top.displayName, cents: top.bidCents }
      : null;
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, board.total);

  return (
    <main>
      <Masthead stats={stats} />
      <ClickTicker initial={clicks} />

      {/* Tighter than before on purpose: the board is the product, and it
          should reach the first screen instead of sitting under a scroll. */}
      <div className="mx-auto max-w-5xl min-w-0 px-4 py-5 sm:px-5 sm:py-7">
        <ClaimPanel
          priceForFirst={priceForFirst}
          enabled={paymentsConfigured()}
          leader={leader}
        />
      </div>

      <div className="mx-auto max-w-5xl min-w-0 px-4 sm:px-5">
        <div className="grid gap-10 border-t border-rule pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] lg:gap-10">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-tight">
                The board
              </h2>
              {board.rows.length > 0 ? (
                <p className="tnum text-[11px] font-bold uppercase tracking-[0.16em] text-mute">
                  {first}&ndash;{last} of {board.total.toLocaleString("en-US")}
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <CategoryPills available={categories} />
            </div>

            {board.rows.length === 0 ? (
              <div className="card mt-6 px-6 py-16 text-center">
                <p className="text-xl font-extrabold tracking-tight">
                  The board is empty
                </p>
                <p className="mt-2 text-sm font-semibold text-mute">
                  The first listing costs $1 and takes the top spot.
                </p>
              </div>
            ) : (
              <ol className="mt-4">
                {board.rows.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    leaderCents={stats.topCents}
                  />
                ))}
              </ol>
            )}

            <Pagination page={page} pages={board.pages} basePath="/" />
          </div>

          <div>
            <SponsorSlot initial={sponsor} enabled={paymentsConfigured()} />
            <ActivityStrip initial={activity} />
          </div>
        </div>
      </div>
    </main>
  );
}
