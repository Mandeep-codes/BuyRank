import { formatUsd } from "@/lib/format";

/**
 * The headline states the deal; the coin under it prices it. That price climbs
 * every time somebody pays, which is the entire pitch.
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
    <div className="text-center">
      <h1 className="font-display text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[0.95] tracking-tight">
        Every rank here
        <br />
        has a{" "}
        <span className="relative inline-block">
          <span className="absolute inset-x-[-6px] bottom-[0.1em] top-[0.18em] -rotate-1 rounded-lg bg-zap" />
          <span className="relative">price tag</span>
        </span>
      </h1>

      <p className="mx-auto mt-5 max-w-md text-lg font-semibold text-mute">
        Pay a dollar more than the listing above you and take its spot. No votes.
        No algorithm. No launch day.
      </p>

      <div className="toon tilt-r mx-auto mt-10 inline-block bg-pop px-10 py-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-paper/90">
          Top spot costs
        </p>
        <p className="font-display text-[clamp(2.75rem,9vw,4.5rem)] font-extrabold leading-none text-paper">
          {formatUsd(priceForFirst)}
        </p>
      </div>

      <p className="mt-5 text-[15px] font-semibold text-mute">
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
  );
}
