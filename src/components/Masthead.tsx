import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import type { BoardStats } from "@/lib/queries";
import { LiveCount } from "./LiveCount";

/**
 * Two rows on a phone — brand and nav, then a single centred stats pill —
 * instead of five items wrapping into a ragged block.
 */
export function Masthead({ stats }: { stats: BoardStats }) {
  return (
    <header className="border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="coin wobble h-9 w-9 bg-pop text-base text-paper sm:h-10 sm:w-10 sm:text-lg">
            {SITE_NAME.charAt(0).toUpperCase()}
          </span>
          <span className="font-display text-xl font-extrabold leading-none tracking-tight sm:text-2xl">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-[15px] font-semibold">
          <Link href="/about" className="underline-offset-4 hover:underline">
            About
          </Link>
          <Link href="/rules" className="underline-offset-4 hover:underline">
            Rules
          </Link>
        </nav>
      </div>

      <div className="border-t-[2.5px] border-ink/10 px-4 pb-3 pt-2.5 sm:pb-3.5">
        <p className="mx-auto flex w-fit flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[13px] font-semibold sm:text-sm">
          <LiveCount />
          <span className="text-mute/40" aria-hidden>
            &middot;
          </span>
          <span>
            <span className="tnum font-bold">{formatUsd(stats.totalCents)}</span>{" "}
            <span className="text-mute">paid</span>
          </span>
          <span className="text-mute/40" aria-hidden>
            &middot;
          </span>
          <span>
            <span className="tnum font-bold">{stats.listings}</span>{" "}
            <span className="text-mute">listed</span>
          </span>
        </p>
      </div>
    </header>
  );
}
