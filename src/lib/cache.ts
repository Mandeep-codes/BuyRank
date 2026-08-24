import { unstable_cache } from "next/cache";
import {
  getActiveCategories,
  getRankedEntries,
  getRecentActivity,
  getRecentClicks,
  getSponsorStates,
  getStats,
  type BoardStats,
  type RankedEntry,
} from "./queries";

/**
 * Why this file exists.
 *
 * The board pages read `searchParams` for pagination, and any route that reads
 * searchParams is rendered dynamically — Next.js can't prerender output that
 * depends on the query string. So `export const revalidate` on those pages was
 * silently doing nothing, and every single visitor was running four queries
 * against Postgres.
 *
 * The fix is to cache the *data* rather than the page. The render stays
 * dynamic, pagination still works, but the queries run once per window no
 * matter how many people are reading.
 *
 * Everything is tagged `board`, so the payment webhook can drop the whole lot
 * the instant a bid lands.
 */
export const BOARD_TAG = "board";

/** Long enough to absorb a spike, short enough that the board feels live. */
const WINDOW_SECONDS = 30;

export const cachedBoard = unstable_cache(
  async (page: number, category: string | null) =>
    getRankedEntries({ page, category }),
  ["board-rows"],
  { revalidate: WINDOW_SECONDS, tags: [BOARD_TAG] },
) as (
  page: number,
  category: string | null,
) => Promise<{ rows: RankedEntry[]; total: number; pages: number }>;

// Key bumped to -v2: Vercel's data cache survives deployments, so the old
// key could briefly serve a stats payload without totalClicks after deploy.
export const cachedStats = unstable_cache(async () => getStats(), ["board-stats-v3"], {
  revalidate: WINDOW_SECONDS,
  tags: [BOARD_TAG],
}) as () => Promise<BoardStats>;

export const cachedActivity = unstable_cache(
  async () => {
    const rows = await getRecentActivity(12);
    // Serialise here so the cached value is plain JSON, not Date objects.
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  },
  ["board-activity"],
  { revalidate: 20, tags: [BOARD_TAG] },
);

/**
 * Shorter window than the bid feed — clicks are the highest-frequency event on
 * the site and the rail should feel close to real time without giving every
 * visitor their own query.
 */
export const cachedClicks = unstable_cache(
  async () => {
    const rows = await getRecentClicks(10);
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  },
  ["board-clicks"],
  { revalidate: 10, tags: [BOARD_TAG] },
);

export const cachedSponsors = unstable_cache(
  async () => getSponsorStates(),
  ["board-sponsor-tiers"],
  { revalidate: 30, tags: [BOARD_TAG] },
);

export const cachedCategories = unstable_cache(
  async () => getActiveCategories(),
  ["board-categories"],
  { revalidate: 60, tags: [BOARD_TAG] },
);
