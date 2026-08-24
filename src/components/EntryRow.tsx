import Link from "next/link";
import { categoryLabel } from "@/lib/config";
import { formatCompact, formatUsd, timeAgo } from "@/lib/format";
import { priceToBeat, type RankedEntry } from "@/lib/queries";

/**
 * Board row. Rank badge, icon, title, description, then a meta line — with the
 * price held top-right at every width so the ranking stays scannable on a
 * phone. Narrow-first: nothing here can push the row wider than its container.
 */
export function EntryRow({ entry }: { entry: RankedEntry; leaderCents: number }) {
  return (
    <li id={`entry-${entry.id}`} className="card mb-3 p-3.5 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          className="rank h-8 w-9 shrink-0 text-[13px] sm:h-9 sm:w-11 sm:text-sm"
          aria-hidden
        >
          #{entry.rank}
        </span>

        {entry.faviconUrl ? (
          // Third-party favicons, not assets we control — plain img is right.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.faviconUrl}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            className="hidden h-11 w-11 shrink-0 rounded-xl border border-cardline bg-paper object-contain p-1.5 sm:block"
          />
        ) : null}

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

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-mute sm:text-[13px]">
            <time dateTime={new Date(entry.updatedAt).toISOString()}>
              {timeAgo(entry.updatedAt)}
            </time>
            <Link
              href={`/category/${entry.category}`}
              className="transition hover:text-ink"
            >
              {categoryLabel(entry.category)}
            </Link>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-pop" aria-hidden />
              <span className="tnum">{formatCompact(entry.clicks)} clicks</span>
            </span>
            <Link
              href={`/?amount=${priceToBeat(entry.bidCents) / 100}#bid`}
              className="tnum ml-auto font-semibold text-pop hover:underline"
            >
              take for {formatUsd(priceToBeat(entry.bidCents))}
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
