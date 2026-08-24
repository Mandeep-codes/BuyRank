import Link from "next/link";
import { categoryLabel } from "@/lib/config";
import { formatCompact, formatUsd, timeAgo } from "@/lib/format";
import { priceToBeat, type RankedEntry } from "@/lib/queries";

/**
 * One board row. Built narrow-first: rank and price stay on the top line at
 * every width, and the metadata wraps underneath rather than overflowing.
 */
export function EntryRow({ entry }: { entry: RankedEntry; leaderCents: number }) {
  const isLead = entry.rank === 1;

  return (
    <li
      id={`entry-${entry.id}`}
      className={`toon-sm relative mb-2.5 px-3 py-3 transition sm:px-4 ${
        isLead ? "bg-zap/25" : "bg-paper"
      }`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span
          className={`coin h-8 w-8 shrink-0 text-[13px] sm:h-9 sm:w-9 sm:text-sm ${
            isLead ? "coin-gold" : ""
          }`}
          aria-hidden
        >
          {entry.rank}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2.5">
            <a
              href={`/r/${entry.id}`}
              target="_blank"
              rel="noopener nofollow sponsored"
              className="group inline-flex min-w-0 items-center gap-1.5 font-bold text-ink"
            >
              {entry.faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.faviconUrl}
                  alt=""
                  width={16}
                  height={16}
                  loading="lazy"
                  className="h-4 w-4 shrink-0 rounded-sm"
                />
              ) : null}
              <span className="truncate text-[15px] underline-offset-4 group-hover:underline">
                {entry.displayName}
              </span>
            </a>

            <span className="tnum shrink-0 text-base font-bold text-pop sm:text-lg">
              {formatUsd(entry.bidCents)}
            </span>
          </div>

          {entry.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-mute">
              {entry.description}
            </p>
          ) : null}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-mute">
            <Link
              href={`/category/${entry.category}`}
              className="hover:text-ink"
            >
              {categoryLabel(entry.category)}
            </Link>
            <span aria-hidden>&middot;</span>
            <span className="tnum">{formatCompact(entry.clicks)} clicks</span>
            <span aria-hidden>&middot;</span>
            <time dateTime={new Date(entry.updatedAt).toISOString()}>
              {timeAgo(entry.updatedAt)}
            </time>
            <Link
              href={`/?amount=${priceToBeat(entry.bidCents) / 100}#bid`}
              className="tnum ml-auto font-bold text-ink underline underline-offset-2 hover:text-pop"
            >
              take for {formatUsd(priceToBeat(entry.bidCents))}
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
