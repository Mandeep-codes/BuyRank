import Link from "next/link";
import { Favicon } from "@/components/Favicon";
import { formatCompact, formatDuration, formatUsd, timeAgo } from "@/lib/format";
import { priceToBeat, type RankedEntry } from "@/lib/queries";

/**
 * Board row. Rank badge, icon, title, description, then a meta line — with the
 * price held top-right at every width so the ranking stays scannable on a
 * phone. Narrow-first: nothing here can push the row wider than its container.
 */
export function EntryRow({ entry }: { entry: RankedEntry; leaderCents: number }) {
  // How long the leader has held the top — measured from their last winning
  // bid. Shown only past the first hour so a fresh takeover isn't "on top 2m".
  const reign =
    Number(entry.rank) === 1
      ? formatDuration(Date.now() - new Date(entry.updatedAt).getTime(), 1)
      : null;

  const isTop = Number(entry.rank) === 1;

  return (
    <li
      id={`entry-${entry.id}`}
      className={`card mb-3 p-4 sm:p-5 ${isTop ? "border-pop/50 bg-popsoft/60" : ""}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          className="rank h-8 w-9 shrink-0 text-[13px] sm:h-9 sm:w-11 sm:text-sm"
          aria-hidden
        >
          #{entry.rank}
        </span>

        <Favicon
          src={entry.faviconUrl}
          url={entry.url}
          name={entry.displayName}
          size={44}
          className="flex h-10 w-10 shrink-0 rounded-xl border border-cardline bg-paper object-contain p-1.5 sm:h-12 sm:w-12"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <a
              href={`/r/${entry.id}`}
              target="_blank"
              rel="noopener nofollow sponsored"
              className="min-w-0 truncate text-[15px] font-bold tracking-tight hover:text-pop sm:text-[17px]"
            >
              {entry.title ? (
                <>
                  {entry.displayName}
                  <span className="font-medium text-mute"> &middot; </span>
                  <span className="font-semibold">{entry.title}</span>
                </>
              ) : (
                entry.displayName
              )}
            </a>

            <span className="tnum shrink-0 text-[17px] font-bold text-pop sm:text-xl">
              {formatUsd(entry.bidCents)}
            </span>
          </div>

          {entry.description ? (
            <p className="mt-1.5 line-clamp-2 text-[14px] leading-snug text-mute">
              {entry.description}
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mute sm:text-[13px]">
            <time dateTime={new Date(entry.updatedAt).toISOString()}>
              {timeAgo(entry.updatedAt)}
            </time>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-pop" aria-hidden />
              <span className="tnum">{formatCompact(entry.clicks)} clicks</span>
            </span>
            {isTop && reign ? (
              <span className="tnum font-semibold text-pop">
                on top {reign}
              </span>
            ) : null}
            <span className="ml-auto flex items-center gap-3">
              <Link
                href={`/l/${entry.id}`}
                aria-label={`Share page for ${entry.displayName}`}
                className="text-mute transition hover:text-ink"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M7 17L17 7" />
                  <path d="M9 7h8v8" />
                </svg>
              </Link>
              <Link
                href={`/?amount=${priceToBeat(entry.bidCents) / 100}#bid`}
                className="tnum font-semibold text-pop hover:underline"
              >
                take for {formatUsd(priceToBeat(entry.bidCents))}
              </Link>
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
