"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/config";
import { formatUsd } from "@/lib/format";

type Preview = {
  url: string;
  displayName: string;
  onBoard: boolean;
  currentBidCents: number;
  minimumCents: number;
};

/**
 * The hero is the price itself, lit from behind, with the two controls that
 * change it either side. Everything else on this screen is caption. The meter
 * underneath splits into the money the leader has already paid and the money
 * you are stacking on top of it, so pressing + shows the overtake happen
 * rather than describing it.
 */
export function ClaimPanel({
  priceForFirst,
  enabled,
  leader,
}: {
  priceForFirst: number;
  enabled: boolean;
  /** Who holds #1 right now — the fight the page is selling. */
  leader?: { name: string; cents: number } | null;
}) {
  const [submission, setSubmission] = useState("");
  const [category, setCategory] = useState("other");
  const [amountCents, setAmountCents] = useState(priceForFirst);
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  //"take it" links from the board land here with an amount.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("amount");
    const dollars = Math.floor(Number(wanted));
    if (dollars > 0) setAmountCents(dollars * 100);
  }, []);

  // Resolve the link as they type so they see what they're actually listing.
  useEffect(() => {
    const value = submission.trim();
    if (value.length < 4) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission: value }),
        });
        setPreview(res.ok ? ((await res.json()) as Preview) : null);
      } catch {
        setPreview(null);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [submission]);

  const minimum = preview?.onBoard ? preview.minimumCents : 100;
  const belowMinimum = amountCents < minimum;
  const takesTop = amountCents >= priceForFirst;

  function step(deltaCents: number) {
    setAmountCents((c) => Math.max(minimum, c + deltaCents));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission,
          category,
          bidDollars: Math.floor(amountCents / 100),
          email: email || undefined,
        }),
      });
      const data = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Couldn't open checkout. Try again.");
        setPending(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Check your connection and try again.");
      setPending(false);
    }
  }

  const ahead = leader ? amountCents > leader.cents : true;
  const ceiling = Math.max(amountCents, leader?.cents ?? 0, 1);
  const leaderPct = leader ? (leader.cents / ceiling) * 100 : 0;
  const yourPct = (amountCents / ceiling) * 100;

  return (
    <section id="bid" className="relative scroll-mt-24 text-center">
      <p className="label">
        {leader ? "Your bid" : "What the first listing costs"}
      </p>

      <div className="mt-5 flex items-center justify-center gap-4 sm:gap-7">
        <button
          type="button"
          onClick={() => step(-100)}
          disabled={amountCents <= minimum}
          className="step h-12 w-12 shrink-0 text-2xl font-light sm:h-14 sm:w-14"
          aria-label="Lower the bid by one dollar"
        >
          &minus;
        </button>

        <span
          className="denom min-w-0 text-[clamp(3rem,12vw,6rem)]"
          style={{ "--lum": 1 } as React.CSSProperties}
        >
          {formatUsd(amountCents)}
        </span>

        <button
          type="button"
          onClick={() => step(100)}
          className="step h-12 w-12 shrink-0 text-2xl font-light sm:h-14 sm:w-14"
          aria-label="Raise the bid by one dollar"
        >
          +
        </button>
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-edge/70">
          {leader ? (
            <>
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-edge transition-[width] duration-300 ease-out"
                style={{ width: `${ahead ? leaderPct : yourPct}%` }}
              />
              {ahead ? (
                <div
                  className="absolute inset-y-0 right-0 rounded-full bg-ink transition-all duration-300 ease-out"
                  style={{ left: `${leaderPct}%` }}
                />
              ) : null}
            </>
          ) : (
            <div className="absolute inset-0 bg-ink" />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-[14px] leading-relaxed">
          {leader ? (
            <>
              <p className="text-dim">
                <span className="font-bold text-ink">{leader.name}</span> holds
                it at{""}
                <span className="tnum font-bold text-ink">
                  {formatUsd(leader.cents)}
                </span>
                {ahead
                  ? ". Anything above that takes the spot."
                  : ". This bid lands further down the board."}
              </p>
              {ahead ? (
                <span className="tnum rounded-full bg-accentwash px-2.5 py-1 text-[11px] font-bold tracking-[0.01em] text-ink">
                  You +{formatUsd(amountCents - leader.cents)}
                </span>
              ) : null}
            </>
          ) : (
            <p className="text-dim">
              The board is empty. One dollar opens it at #1.
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-9 max-w-3xl text-left"
      >
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto]">
          <label className="block">
            <span className="sr-only">Product URL or @handle</span>
            <input
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="yourproduct.com or @handle"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              required
              className="field"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="field appearance-none pr-9"
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dim"
              width="11"
              height="7"
              viewBox="0 0 11 7"
              fill="none"
              aria-hidden
            >
              <path
                d="M1 1l4.5 4.5L10 1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </label>

          <button
            type="submit"
            disabled={!enabled || pending || belowMinimum || !submission}
            className="btn btn-ink w-full px-9 py-4 md:w-auto"
          >
            {!enabled
              ? "Soon"
              : pending
                ? "Opening"
                : takesTop
                  ? "Take #1"
                  : "Place bid"}
          </button>
        </div>

        <label className="mt-2 block">
          <span className="sr-only">Email for the receipt</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email for your receipt (optional)"
            autoComplete="email"
            autoCapitalize="none"
            className="field py-3"
          />
        </label>

        <p className="mt-3 min-h-[2.5rem] text-center text-[13px] leading-relaxed text-dim">
          {!enabled ? (
            "Bidding opens as soon as payment setup is finished."
          ) : error ? (
            <span className="font-semibold text-ink">{error}</span>
          ) : belowMinimum ? (
            <span className="font-semibold text-ink">
              {preview?.onBoard
                ? `That link already holds ${formatUsd(preview.currentBidCents)}. Bid at least ${formatUsd(minimum)} to move it up.`
                : "The minimum bid is $1."}
            </span>
          ) : preview?.onBoard ? (
            <>
              <span className="font-bold text-ink">{preview.displayName}</span>
              {""}
              is already on the board at{""}
              {formatUsd(preview.currentBidCents)}. Bidding again raises it to
              {""}
              {formatUsd(amountCents)}.
            </>
          ) : (
            "One payment, no subscription. Already listed? Enter the same link to raise your bid."
          )}
        </p>
      </form>
    </section>
  );
}
