import Link from "next/link";
import { MIN_CLICKS_STAT, MIN_PAID_STAT_CENTS, SITE_NAME } from "@/lib/config";
import { formatCompact, formatUsd } from "@/lib/format";
import type { BoardStats } from "@/lib/queries";
import { LiveCount } from "./LiveCount";

export function Masthead({ stats }: { stats: BoardStats }) {
  return (
    <header>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="rank h-8 w-8 text-[15px]">
            {SITE_NAME.charAt(0).toUpperCase()}
          </span>
          <span className="text-[19px] font-extrabold tracking-tight">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-4 text-[14px] font-medium text-mute sm:gap-7 sm:text-[15px]">
          <Link href="/rules" className="transition hover:text-ink">
            Rules
          </Link>
          <Link href="/about" className="transition hover:text-ink">
            About
          </Link>
        </nav>
      </div>

      {/* One quiet pill, centred — the reference puts its live numbers here. */}
      <div className="px-4">
        <p className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-wash px-4 py-2 text-center text-[13px] font-medium text-mute sm:text-sm">
          <LiveCount initialOnline={stats.onlineNow} initialTotal={stats.totalVisitors} />
          {Number(stats.totalClicks ?? 0) >= MIN_CLICKS_STAT ? (
            <>
              <span aria-hidden>&middot;</span>
              <span>
                <span className="tnum font-semibold text-ink">
                  {formatCompact(stats.totalClicks)}
                </span>{" "}
                clicks delivered
              </span>
            </>
          ) : null}
          {stats.totalCents >= MIN_PAID_STAT_CENTS ? (
            <>
              <span aria-hidden>&middot;</span>
              <span>
                <span className="tnum font-semibold text-ink">
                  {formatUsd(stats.totalCents)}
                </span>{" "}
                paid so far
              </span>
            </>
          ) : null}
          <span aria-hidden>&middot;</span>
          <span>
            <span className="tnum font-semibold text-ink">
              {stats.listings}
            </span>{" "}
            listed
          </span>
        </p>
      </div>
    </header>
  );
}
