import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import type { BoardStats } from "@/lib/queries";
import { LiveCount } from "./LiveCount";

export function Masthead({ stats }: { stats: BoardStats }) {
  return (
    <header className="border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="coin wobble h-11 w-11 bg-pop text-xl text-paper">
            {SITE_NAME.charAt(0).toUpperCase()}
          </span>
          <span className="font-display text-3xl font-extrabold leading-none tracking-tight">
            {SITE_NAME}
          </span>
        </Link>

        {/* Straight from the bids table — no invented social proof. */}
        <p className="toon-sm tnum bg-zap px-4 py-2 text-sm font-bold">
          {formatUsd(stats.totalCents)} paid so far
        </p>

        <nav className="ml-auto flex items-center gap-5 text-[15px] font-bold">
          <Link href="/about" className="underline-offset-4 hover:underline">
            About
          </Link>
          <Link href="/rules" className="underline-offset-4 hover:underline">
            Rules
          </Link>
        </nav>

        <LiveCount />

        <div className="toon-sm flex items-center gap-3 bg-paper px-4 py-2 text-sm font-bold">
          <span className="flex items-center gap-2">
            <span className="tnum">{stats.listings}</span>
            <span className="text-mute">listed</span>
          </span>
          <span className="h-4 w-[2px] bg-ink/20" aria-hidden />
          <span className="flex items-center gap-2">
            <span className="tnum">{stats.bidCount}</span>
            <span className="text-mute">bids</span>
          </span>
        </div>
      </div>
    </header>
  );
}
