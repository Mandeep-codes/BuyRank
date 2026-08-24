import { formatUsd } from "@/lib/format";

/**
 * Compact, left-aligned, and sized so the board clears the fold. This used to
 * be a centred full-height block — a leaderboard site where you have to scroll
 * past the headline to reach the leaderboard has its priorities backwards.
 */
export function Hero({
  priceForFirst,
  leader,
  topCents,
}: {
  priceForFirst: number;
  leader: string | null;
  topCents: number;
}) {
  return (
    <div>
      <h1 className="font-display text-[clamp(2rem,4.4vw,3.1rem)] font-extrabold leading-[1.02] tracking-tight">
        Every rank here
        <br />
        has a{" "}
        <span className="relative inline-block">
          <span className="absolute inset-x-[-6px] bottom-[0.1em] top-[0.18em] -rotate-1 rounded-lg bg-zap" />
          <span className="relative">price tag</span>
        </span>
      </h1>

      <p className="mt-4 max-w-md text-[15px] font-semibold leading-relaxed text-mute">
        Pay a dollar more than the listing above you and take its spot. No
        votes. No algorithm. No launch day.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <div className="toon tilt-r inline-block bg-pop px-6 py-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-paper/90">
            Top spot costs
          </p>
          <p className="font-display text-[2.6rem] font-extrabold leading-none text-paper">
            {formatUsd(priceForFirst)}
          </p>
        </div>

        <p className="max-w-[14rem] text-sm font-semibold text-mute">
          {leader ? (
            <>
              <span className="text-ink">{leader}</span> is holding it at{" "}
              <span className="tnum">{formatUsd(topCents)}</span>
            </>
          ) : (
            "Nobody has bid yet. The first dollar takes it."
          )}
        </p>
      </div>
    </div>
  );
}
