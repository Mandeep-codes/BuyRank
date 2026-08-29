"use client";

import { useEffect, useState } from "react";
import { Favicon } from "@/components/Favicon";
import { SPONSOR_MAX_DAYS, type SponsorTier } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import type { AllSponsorStates, SponsorState } from "@/lib/queries";

/** "6h 6m left" — under an hour it switches to minutes only. */
function timeLeft(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "ending now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m left`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
}

/**
 * A placement card in the rail beside the object: a slot, its price, and the
 * one action. Rented, it shows whose mark is in it and how long the rental has
 * left. Open, it is an offer rather than a placeholder.
 */
export function SponsorSlot({
  tier,
  index,
  initial,
  enabled,
}: {
  tier: SponsorTier;
  /** Which slot this is in the rail, for the heading. */
  index: number;
  initial: SponsorState;
  enabled: boolean;
}) {
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [days, setDays] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Countdown ticks locally; the state itself refreshes on a slow poll.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const refresh = setInterval(async () => {
      try {
        const res = await fetch("/api/sponsor");
        if (!res.ok) return;
        const data = (await res.json()) as { tiers?: AllSponsorStates };
        const next = data.tiers?.[tier.id];
        if (next) setState(next);
      } catch {
        // Keep showing the last known state.
      }
    }, 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [tier.id]);

  async function rent(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "sponsor",
          submission: url,
          days,
          tier: tier.id,
        }),
      });
      const data = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Couldn't start checkout.");
        setPending(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Couldn't start checkout. Try again in a moment.");
      setPending(false);
    }
  }

  const current = state.current;
  const rented = current && new Date(current.endsAt).getTime() > now;

  return (
    <section className="card p-4" aria-label={`${tier.label} placement`}>
      <div className="flex items-center gap-3">
        <span className="tile h-10 w-10 shrink-0 overflow-hidden">
          {rented ? (
            <Favicon
              src={current.faviconUrl}
              url={current.url}
              name={current.displayName}
              size={22}
            />
          ) : (
            <span className="text-[18px] font-light leading-none">+</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[16px] font-semibold tracking-[-0.01em]">
            {rented ? current.displayName : `Slot #${index}`}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-dim">
            {rented ? timeLeft(current.endsAt, now) : tier.label}
          </p>
        </div>
      </div>

      {rented ? (
        <p className="mt-4 flex items-center justify-between gap-2 text-[13px] text-dim">
          <span className="tnum">
            <span className="text-ink">
              {current.windowClicks.toLocaleString("en-US")}
            </span>{" "}
            clicks
          </span>
          <a
            href={`/r/${current.entryId}`}
            target="_blank"
            rel="noopener nofollow sponsored"
            className="btn btn-quiet px-3 py-1.5 text-[13px]"
          >
            Visit
          </a>
        </p>
      ) : !open ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="tnum text-[13px] text-dim">
            <span className="text-ink">{formatUsd(tier.priceCentsPerDay)}</span>{" "}
            · 1 day
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!enabled}
            className="btn btn-claim px-3.5 py-1.5 text-[13px]"
          >
            {enabled ? "Claim →" : "Soon"}
          </button>
        </div>
      ) : (
        <form onSubmit={rent} className="mt-4">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourproject.com"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="field py-2 text-[14px]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Fewer days"
                onClick={() => setDays((d) => Math.max(1, d - 1))}
                className="step h-7 w-7 text-[14px]"
              >
                &minus;
              </button>
              <span className="tnum min-w-[3.5ch] text-center text-[13px]">
                {days}d
              </span>
              <button
                type="button"
                aria-label="More days"
                onClick={() =>
                  setDays((d) => Math.min(SPONSOR_MAX_DAYS, d + 1))
                }
                className="step h-7 w-7 text-[14px]"
              >
                +
              </button>
            </div>
            <span className="denom text-[16px] font-semibold">
              {formatUsd(days * tier.priceCentsPerDay)}
            </span>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn btn-ink mt-2.5 w-full py-2 text-[13px]"
          >
            {pending ? "Opening…" : "Continue to payment"}
          </button>
          {error ? (
            <p className="mt-2 text-[12px] text-accent">{error}</p>
          ) : null}
        </form>
      )}
    </section>
  );
}
