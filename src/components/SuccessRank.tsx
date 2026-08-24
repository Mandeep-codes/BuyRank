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
      <div className="mt-8">
        <p className="rank mx-auto h-16 w-20 text-2xl">#{result.rank}</p>
        <p className="mt-4 text-[16px] font-semibold">
          <span className="text-ink">{result.displayName}</span>{" "}
          <span className="text-mute">is live at #{result.rank}.</span>
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
    <p className="mt-6 text-[14px] text-mute" aria-live="polite">
      {gaveUp
        ? "Payments can take a minute to clear — your listing appears the moment it does."
        : "Confirming your spot on the board…"}
    </p>
  );
}
