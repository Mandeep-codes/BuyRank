"use client";

import { useEffect, useState } from "react";
import { ShareRow } from "@/components/ShareRow";

type RankResult = {
  found: boolean;
  id?: string;
  rank?: number;
  displayName?: string;
};

/**
 * Right after checkout the webhook may still be in flight, so this polls the
 * rank for up to 30 seconds and then shows the spot the buyer just took —
 * which is the exact moment they're most willing to share it.
 */
export function SuccessRank({
  name,
  siteName,
  siteUrl,
}: {
  name: string;
  siteName: string;
  siteUrl: string;
}) {
  const [result, setResult] = useState<RankResult | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function poll() {
      tries += 1;
      try {
        const res = await fetch(`/api/rank?u=${encodeURIComponent(name)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as RankResult;
          if (cancelled) return;
          if (data.found) {
            setResult(data);
            return;
          }
        }
      } catch {
        // Fall through to retry.
      }
      if (cancelled) return;
      if (tries >= 10) {
        setGaveUp(true);
        return;
      }
      setTimeout(poll, 3000);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (result?.found && result.rank && result.id) {
    return (
      <div className="mt-8 pt-8">
        <p className="label">Position taken</p>
        <p
          className="denom mt-3 text-[clamp(3.4rem,13vw,6rem)]"
          style={{ "--lum": 1 } as React.CSSProperties}
        >
          #{result.rank}
        </p>
        <p className="mt-3 text-[15px]">
          <span className="font-semibold">{result.displayName}</span>
          {""}
          <span className="text-dim">is live at #{result.rank}.</span>
        </p>
        <div className="mt-6">
          <ShareRow
            url={`${siteUrl}/l/${result.id}`}
            text={`${result.displayName} just took #${result.rank} on ${siteName}. Outbid it if you dare.`}
          />
        </div>
      </div>
    );
  }

  return (
    <p
      className="mt-6 text-[11px] font-semibold tracking-[0.01em] text-dim"
      aria-live="polite"
    >
      {gaveUp
        ? "Payments can take a minute to clear. Your listing appears the moment it does."
        : "Confirming your spot…"}
    </p>
  );
}
