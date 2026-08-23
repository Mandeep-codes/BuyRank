import Link from "next/link";
import { categoryLabel } from "@/lib/config";
import { formatCompact, formatUsd, timeAgo } from "@/lib/format";
import { priceToBeat, type RankedEntry } from "@/lib/queries";

/**
 * Log scale. Linear would render the leader as a full bar and everything past
 * about tenth place as a sliver, hiding the shape of the board instead of
 * showing it.
 */
function depthWidth(bidCents: number, leaderCents: number): number {
  if (leaderCents <= 0) return 0;
  const share = Math.log10(bidCents + 100) / Math.log10(leaderCents + 100);
  return Math.max(8, Math.min(100, share * 100));
}

export function EntryRow({
  entry,
  leaderCents,
}: {
  entry: RankedEntry;
  leaderCents: number;
}) {
  const isLead = entry.rank === 1;

  return (
    <li
      className={`relative border-b-[3px] border-ink transition last:border-b-0 ${
        isLead ? "bg-zap/35" : "bg-paper hover:bg-cream"
      }`}
    >
      <div
        className="depth"
        style={{ width: `${depthWidth(entry.bidCents, leaderCents)}%` }}
        aria-hidden
      />

      <div className="relative flex items-start gap-3.5 px-3.5 py-4 sm:gap-4 sm:px-5">
        {/* Rank badge — a stamped chip, not a number floating in space. */}
        <span
          className={`toon-sm flex h-10 w-10 shrink-0 items-center justify-center font-display text-base font-bold shadow-[2.5px_2.5px_0_var(--ink)] sm:h-11 sm:w-11 sm:text-lg ${
            isLead ? "bg-pop text-paper" : entry.rank <= 3 ? "bg-zap" : "bg-paper"
          }`}
          aria-hidden
        >
          {entry.rank}
        </span>
        <span className="sr-only">Rank {entry.rank}</span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <a
              href={`/r/${entry.id}`}
              target="_blank"
              rel="noopener nofollow sponsored"
              className="group inline-flex min-w-0 items-center gap-2 font-bold transition hover:text-pop"
            >
              {entry.faviconUrl ? (
                // Third-party favicons, not assets we control — plain img is right.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.faviconUrl}
                  alt=""
                  width={18}
                  height={18}
                  loading="lazy"
                  className="h-[18px] w-[18px] shrink-0 rounded"
                />
              ) : null}
              <span className="truncate underline-offset-4 group-hover:underline">
                {entry.displayName}
              </span>
            </a>

            <span className={`tag tnum font-bold ${isLead ? "text-lg" : "text-sm"}`}>
              {formatUsd(entry.bidCents)}
            </span>
          </div>

          {entry.description ? (
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm font-medium leading-relaxed text-mute">
              {entry.description}
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-mute">
            <Link
              href={`/category/${entry.category}`}
              className="transition hover:text-ink"
            >
              {categoryLabel(entry.category)}
            </Link>
            <span aria-hidden>&bull;</span>
            <span className="tnum">{formatCompact(entry.clicks)} clicks</span>
            <span aria-hidden>&bull;</span>
            <time dateTime={new Date(entry.updatedAt).toISOString()}>
              {timeAgo(entry.updatedAt)}
            </time>
          </div>
        </div>

        <Link
          href={`/?amount=${priceToBeat(entry.bidCents) / 100}#bid`}
          className="toon-sm press tnum hidden shrink-0 self-center whitespace-nowrap bg-sky/25 px-3.5 py-2 text-xs font-bold sm:block"
        >
          take it for {formatUsd(priceToBeat(entry.bidCents))}
        </Link>
      </div>
    </li>
  );
}
