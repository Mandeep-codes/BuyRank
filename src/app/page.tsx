import { BidForm } from "@/components/BidForm";
import { CategoryPills } from "@/components/CategoryPills";
import { EntryRow } from "@/components/EntryRow";
import { Hero } from "@/components/Hero";
import { Masthead } from "@/components/Masthead";
import { Pagination } from "@/components/Pagination";
import { ActivityStrip } from "@/components/ActivityStrip";
import { SetupNotice, databaseErrorCode } from "@/components/SetupNotice";
import { PAGE_SIZE } from "@/lib/config";
import { paymentsConfigured } from "@/lib/dodo";
import { cachedActivity, cachedBoard, cachedStats } from "@/lib/cache";
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

  let board, stats, activity;

  try {
    // Three, not four. getPriceForFirst() used to re-run the entire ranking
    // query just to read the top bid — which stats already gives us.
    [board, stats, activity] = await Promise.all([
      cachedBoard(page, null),
      cachedStats(),
      cachedActivity(),
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
  const leader = page === 1 ? (board.rows[0]?.displayName ?? null) : null;
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, board.total);

  return (
    <main>
      <Masthead stats={stats} />

      {/*
        Split hero so the board clears the fold: pitch and price on the left,
        the one action on the right. Board and recent bids sit directly under
        it rather than a screen further down.
      */}
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-14">
          <Hero
            priceForFirst={priceForFirst}
            leader={leader}
            topCents={stats.topCents}
          />
          <BidForm priceForFirst={priceForFirst} enabled={paymentsConfigured()} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-10 border-t-[3px] border-dashed border-ink/25 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] lg:gap-12">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                The board
              </h2>
              {board.rows.length > 0 ? (
                <p className="tnum text-[11px] font-bold uppercase tracking-[0.16em] text-mute">
                  {first}&ndash;{last} of {board.total.toLocaleString("en-US")}
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <CategoryPills />
            </div>

            {board.rows.length === 0 ? (
              <div className="toon mt-6 bg-paper px-6 py-16 text-center">
                <p className="font-display text-2xl font-extrabold tracking-tight">
                  The board is empty
                </p>
                <p className="mt-2 text-sm font-semibold text-mute">
                  The first listing costs $1 and takes the top spot.
                </p>
              </div>
            ) : (
              <ol className="mt-5">
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

          <ActivityStrip initial={activity} />
        </div>
      </div>
    </main>
  );
}
