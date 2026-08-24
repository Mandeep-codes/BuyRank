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
 * One placement, two states. Rented: the sponsor's card, clicks counted from
 * this rental's own start, live countdown. Open: the rent form — an offer
 * instead of a placeholder. Placement height on the page tracks price:
 * Premium sits highest, Standard lowest.
 */
export function SponsorSlot({
  tier,
  initial,
  enabled,
}: {
  tier: SponsorTier;
  initial: SponsorState;
  enabled: boolean;
}) {
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(() => Date.now());

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

  const current = state.current;
  const rented = current && new Date(current.endsAt).getTime() > now;

  return (
    <div className="mb-7">
      {rented ? (
        <>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-pop">
            Sponsored
          </h2>
          <a
            href={`/r/${current.entryId}`}
            target="_blank"
            rel="noopener nofollow sponsored"
            className="card mt-4 block p-4 text-center"
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-cardline bg-paper shadow-sm">
              <Favicon
                src={current.faviconUrl}
                url={current.url}
                name={current.displayName}
                size={26}
              />
            </span>
            <span className="mt-2.5 block truncate text-[15px] font-extrabold tracking-tight">
              {current.displayName}
            </span>
            {current.description ? (
              <span className="mt-1 block text-[12px] leading-snug text-mute [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                {current.description}
              </span>
            ) : null}
            <span className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              <span className="tnum rounded-lg bg-popsoft px-2 py-0.5 text-[11px] font-bold text-pop">
                {current.windowClicks.toLocaleString("en-US")}{" "}
                {current.windowClicks === 1 ? "click" : "clicks"}
              </span>
              <span className="tnum rounded-lg bg-popsoft px-2 py-0.5 text-[11px] font-bold text-pop">
                {timeLeft(current.endsAt, now)}
              </span>
            </span>
          </a>
          <p className="mt-1.5 text-center text-[11px] text-mute">
            Clicks counted since this rental started.
          </p>
        </>
      ) : (
        <RentForm tier={tier} enabled={enabled} nextOpenAt={state.nextOpenAt} />
      )}
    </div>
  );
}

function RentForm({
  tier,
  enabled,
  nextOpenAt,
}: {
  tier: SponsorTier;
  enabled: boolean;
  nextOpenAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [days, setDays] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const queueMs = new Date(nextOpenAt).getTime() - Date.now();
  const queuedHours = Math.ceil(queueMs / 3_600_000);

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
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
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

  return (
    <section
      aria-label={`Rent the ${tier.label} sponsored spot`}
      className="rounded-[18px] border border-dashed border-pop/50 bg-wash p-4 text-center"
    >
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-popsoft text-[17px] font-extrabold text-pop shadow-sm">
        $
      </span>
      <p className="mt-2.5 text-[14px] font-extrabold tracking-tight">
        Promote your project here
      </p>
      <p className="mt-1 text-[12px] leading-snug text-mute">
        {tier.label} placement,{" "}
        <span className="font-bold text-ink">
          {formatUsd(tier.priceCentsPerDay)} / day
        </span>
        . Clicks on it are counted and shown.
      </p>

      {!open ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!enabled}
            className="pill mt-3 w-full bg-pop px-4 py-2 text-[13px] font-bold text-paper transition hover:bg-[#d9542f] disabled:cursor-not-allowed disabled:bg-popsoft disabled:text-pop/50"
          >
            {enabled ? "Rent this spot" : "Opening soon"}
          </button>
          {queuedHours > 0 ? (
            <p className="tnum mt-1.5 text-[11px] text-mute">
              Next opening in ~{queuedHours}h — new rentals queue behind it.
            </p>
          ) : null}
        </>
      ) : (
        <form onSubmit={rent} className="mt-3 text-left">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourproject.com"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="field w-full text-[14px]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Fewer days"
                onClick={() => setDays((d) => Math.max(1, d - 1))}
                className="step h-8 w-8 text-[15px]"
              >
                &minus;
              </button>
              <span className="tnum min-w-12 text-center text-[12px] font-bold">
                {days} {days === 1 ? "day" : "days"}
              </span>
              <button
                type="button"
                aria-label="More days"
                onClick={() => setDays((d) => Math.min(SPONSOR_MAX_DAYS, d + 1))}
                className="step h-8 w-8 text-[15px]"
              >
                +
              </button>
            </div>
            <span className="tnum text-[14px] font-extrabold text-pop">
              {formatUsd(days * tier.priceCentsPerDay)}
            </span>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="pill mt-2.5 w-full bg-pop px-4 py-2 text-[13px] font-bold text-paper transition hover:bg-[#d9542f] disabled:cursor-not-allowed disabled:bg-popsoft disabled:text-pop/50"
          >
            {pending ? "Starting checkout…" : "Continue to payment"}
          </button>
          {error ? (
            <p className="mt-1.5 text-[11px] font-semibold text-pop">{error}</p>
          ) : null}
        </form>
      )}
    </section>
  );
}
