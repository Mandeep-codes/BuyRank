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
        One centred column. This was three columns with a rail either side, but
        both rails rendered the same feed — the page showed identical rows
        twice. One strip below the form says it once.
      */}
      <div className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
        <Hero
          priceForFirst={priceForFirst}
          leader={leader}
          topCents={stats.topCents}
        />

        <div className="mx-auto mt-10 max-w-lg">
          <BidForm priceForFirst={priceForFirst} enabled={paymentsConfigured()} />
        </div>

        <ActivityStrip initial={activity} />
      </div>

      <div className="mx-auto max-w-5xl px-5">
        <div className="border-t-[3px] border-dashed border-ink/25 pt-12">
          <h2 className="font-display text-4xl font-bold tracking-tight">The board</h2>
          <p className="mt-2 text-[15px] font-semibold text-mute">
            Ranked by standing bid. Nothing else moves a listing up.
          </p>

          <div className="mt-7">
            <CategoryPills />
          </div>

          {board.rows.length === 0 ? (
            <div className="toon mt-8 bg-zap/30 px-6 py-20 text-center">
              <p className="font-display text-3xl font-bold tracking-tight">
                The board is empty
              </p>
              <p className="mt-2 text-sm font-semibold text-mute">
                The first listing costs $1 and takes the top spot.
              </p>
            </div>
          ) : (
            <>
              <p className="tnum mt-7 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
                {first}&ndash;{last} of {board.total.toLocaleString("en-US")}
              </p>

              <ol className="toon mt-3 overflow-hidden p-0">
                {board.rows.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    leaderCents={stats.topCents}
                  />
                ))}
              </ol>

              <Pagination page={page} pages={board.pages} basePath="/" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
