import Link from "next/link";
import { Favicon } from "@/components/Favicon";
import { categoryLabel, MIN_CLICKS_STAT, MIN_VIEWS_STAT } from "@/lib/config";
import { formatCompact, formatUsd } from "@/lib/format";
import { priceToBeat, type RankedEntry } from "@/lib/queries";

/**
 * A row of the register. The table is the plain, complete account of the board
 * behind the object at the top of the page: index, listing, category, clicks
 * delivered, standing bid, and the one button that takes it off them.
 *
 * There is deliberately no date on a row. When something was listed has no
 * bearing on where it sits; only the number does.
 */
export function EntryRow({ entry }: { entry: RankedEntry }) {
  const rank = Number(entry.rank);
  const takeFor = priceToBeat(entry.bidCents);

  return (
    <li className="sheet-row">
      <div className="flex items-center gap-3 px-4 py-4 sm:gap-5 sm:px-5">
        <span
          className="tnum hidden w-7 shrink-0 font-mono text-[13px] text-dim sm:block"
          aria-hidden
        >
          {String(rank).padStart(2, "0")}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Favicon
            src={entry.faviconUrl}
            url={entry.url}
            name={entry.displayName}
            size={32}
            className="tile h-8 w-8 shrink-0 object-contain p-1"
          />
          <div className="min-w-0">
            <a
              href={`/r/${entry.id}`}
              target="_blank"
              rel="noopener nofollow sponsored"
              className="block truncate text-[15px] font-semibold leading-snug tracking-[-0.01em] transition hover:text-accent"
            >
              {entry.displayName}
              {entry.title ? (
                <span className="font-normal text-dim"> · {entry.title}</span>
              ) : null}
            </a>
            {entry.description ? (
              <p className="mt-0.5 truncate text-[13px] leading-relaxed text-dim">
                {entry.description}
              </p>
            ) : null}
          </div>
        </div>

        <span className="label hidden w-40 shrink-0 truncate lg:block">
          {categoryLabel(entry.category)}
        </span>

        {/* Views first: it is the honest number that is actually large, and
            it answers "how often was this put in front of someone". Clicks sit
            under it once there are enough of them to mean anything. */}
        <span className="hidden w-28 shrink-0 text-[13px] leading-tight md:block">
          {entry.views >= MIN_VIEWS_STAT ? (
            <span className="block text-dim">
              <span className="tnum text-ink">
                {formatCompact(entry.views)}
              </span>{" "}
              views
            </span>
          ) : null}
          {entry.clicks >= MIN_CLICKS_STAT ? (
            <span className="mt-0.5 block text-dim">
              <span className="tnum">{formatCompact(entry.clicks)}</span> clicks
            </span>
          ) : null}
        </span>

        <span className="denom w-16 shrink-0 text-right text-[17px] font-semibold">
          {formatUsd(entry.bidCents)}
        </span>

        <span className="flex shrink-0 items-center gap-1">
          <Link
            href={`/l/${entry.id}`}
            aria-label={`Share page for ${entry.displayName}`}
            className="hidden rounded-lg p-2 text-dim transition hover:bg-wash hover:text-ink sm:block"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </Link>

          <Link
            href={`/?amount=${takeFor / 100}#bid`}
            className="btn btn-ink px-4 py-2 text-[13px]"
          >
            Outbid
          </Link>
        </span>
      </div>
    </li>
  );
}
