import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import type { BoardStats } from "@/lib/queries";
import { LiveCount } from "./LiveCount";

/**
 * The header carried four separate outlined pills — revenue, listings, bids,
 * and live visitors — all shouting at the same volume as the logo. Numbers now
 * sit in one quiet row so the logo and the price below it can lead.
 */
export function Masthead({ stats }: { stats: BoardStats }) {
  return (
    <header className="border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="coin wobble h-10 w-10 bg-pop text-lg text-paper">
            {SITE_NAME.charAt(0).toUpperCase()}
          </span>
          <span className="font-display text-2xl font-extrabold leading-none tracking-tight">
            {SITE_NAME}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-x-5 gap-y-2 text-sm font-semibold">
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="tnum font-bold">{formatUsd(stats.totalCents)}</span>
            <span className="text-mute">paid</span>
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="tnum font-bold">{stats.listings}</span>
            <span className="text-mute">listed</span>
          </span>
          <LiveCount />
          <nav className="flex items-center gap-4">
            <Link href="/about" className="underline-offset-4 hover:underline">
              About
            </Link>
            <Link href="/rules" className="underline-offset-4 hover:underline">
              Rules
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
