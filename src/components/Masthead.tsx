import Link from "next/link";
import { MIN_PAID_STAT_CENTS, SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import type { BoardStats } from "@/lib/queries";
import { LiveCount } from "./LiveCount";

/**
 * A thin white bar with one hairline under it. The only figure it carries is
 * the total that has changed hands, held back until that number argues for the
 * board rather than against it.
 */
export function Masthead({ stats }: { stats: BoardStats }) {
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:gap-6 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink font-display text-[14px] font-semibold leading-none text-paper">
            {SITE_NAME.charAt(0).toUpperCase()}
          </span>
          <span className="font-display text-[17px] font-semibold leading-none tracking-[-0.02em]">
            {SITE_NAME}
          </span>
        </Link>

        <span className="hidden text-[13px] text-dim lg:block">
          Rank is bought, not earned
        </span>

        <div className="ml-auto flex items-center gap-5 sm:gap-7">
          {stats.totalCents >= MIN_PAID_STAT_CENTS ? (
            <p className="hidden items-baseline gap-1.5 text-[13px] sm:flex">
              <span className="denom font-semibold">
                {formatUsd(stats.totalCents)}
              </span>
              <span className="text-dim">raised</span>
            </p>
          ) : null}

          <nav className="flex items-center gap-5 text-[13px] text-dim">
            <Link href="/rules" className="transition hover:text-ink">
              Rules
            </Link>
            <Link href="/about" className="transition hover:text-ink">
              About
            </Link>
          </nav>
        </div>
      </div>

      {/* Presence keeps accruing; the component itself renders nothing. */}
      <LiveCount
        initialOnline={stats.onlineNow}
        initialTotal={stats.totalVisitors}
      />
    </header>
  );
}
