import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import type { BoardStats } from "@/lib/queries";
import { LiveCount } from "./LiveCount";

export function Masthead({ stats }: { stats: BoardStats }) {
  return (
    <header>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="rank h-8 w-8 text-[15px]">
            {SITE_NAME.charAt(0).toUpperCase()}
          </span>
          <span className="text-[19px] font-extrabold tracking-tight">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-[15px] font-medium text-mute sm:gap-7">
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
          <LiveCount />
          <span aria-hidden>&middot;</span>
          <span>
            <span className="tnum font-semibold text-ink">
              {formatUsd(stats.totalCents)}
            </span>{" "}
            paid so far
          </span>
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
