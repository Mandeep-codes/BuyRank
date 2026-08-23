import { BidForm } from "@/components/BidForm";
import { CategoryPills } from "@/components/CategoryPills";
import { EntryRow } from "@/components/EntryRow";
import { Hero } from "@/components/Hero";
import { Masthead } from "@/components/Masthead";
import { Pagination } from "@/components/Pagination";
import { Rail } from "@/components/Rail";
import { SetupNotice, databaseErrorCode } from "@/components/SetupNotice";
import { PAGE_SIZE } from "@/lib/config";
import { paymentsConfigured } from "@/lib/dodo";
import {
  getPriceForFirst,
  getRankedEntries,
  getRecentActivity,
  getStats,
} from "@/lib/queries";

// Revalidated by the payment webhook whenever money moves.
export const revalidate = 30;

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let board, stats, priceForFirst, activity;

  try {
    [board, stats, priceForFirst, activity] = await Promise.all([
      getRankedEntries({ page, category: null }),
      getStats(),
      getPriceForFirst(),
      getRecentActivity(12),
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

  const feed = activity.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  const leader = page === 1 ? (board.rows[0]?.displayName ?? null) : null;
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, board.total);

  return (
    <main>
      <Masthead stats={stats} />

      {/*
        Three columns on desktop: the rails carry proof that money is moving,
        the centre carries the single action. On mobile the rails fall below
        the form, because the action matters more than the proof on a phone.
      */}
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="order-2 lg:order-1">
            <div className="tilt-l">
              <Rail title="Recent bids" initial={feed} accent="sun" />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Hero
              priceForFirst={priceForFirst}
              leader={leader}
              topCents={stats.topCents}
            />
            <div className="mx-auto mt-10 max-w-lg">
              <BidForm
                priceForFirst={priceForFirst}
                enabled={paymentsConfigured()}
              />
            </div>
          </div>

          <div className="order-3">
            <div className="tilt-r">
              <Rail title="Who just paid" initial={feed} accent="sky" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5">
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
