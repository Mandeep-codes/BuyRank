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
 * Hero and bid form merged into one panel.
 *
 * The price sits inside the headline with −/+ steppers rather than in a
 * separate card above a separate amount field. On a phone that turns "decide
 * what to bid" into two taps instead of focusing a number input and typing,
 * and it removes a whole screen of height — which matters because most of this
 * traffic arrives from a link in a social app.
 */
export function ClaimPanel({
  priceForFirst,
  enabled,
}: {
  priceForFirst: number;
  enabled: boolean;
}) {
  const [submission, setSubmission] = useState("");
  const [category, setCategory] = useState("other");
  const [amountCents, setAmountCents] = useState(priceForFirst);
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // "take it for $X" links from the board land here with an amount.
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

  function step(deltaCents: number) {
    setAmountCents((c) => Math.max(minimum, c + deltaCents));
  }

  /** What rank this bid buys, in plain words. */
  const standing = (() => {
    if (belowMinimum) return null;
    if (amountCents >= priceForFirst) return "This takes the top spot.";
    return "Lands wherever this amount reaches on the board.";
  })();

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
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
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

  // 44px touch targets; .field pins font-size to 16px so iOS doesn't zoom.
  const stepper = "step h-11 w-11 shrink-0 text-2xl font-semibold";

  return (
    <section id="bid" className="scroll-mt-4 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
        <h1 className="text-[clamp(1.9rem,6.5vw,3.4rem)] font-extrabold leading-none tracking-tight">
          Claim #1 for
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => step(-100)}
            disabled={amountCents <= minimum}
            className={stepper}
            aria-label="Lower the bid by one dollar"
          >
            &minus;
          </button>

          <span className="tnum text-[clamp(2.2rem,9vw,3.4rem)] font-extrabold leading-none tracking-tight text-pop">
            {formatUsd(amountCents)}
          </span>

          <button
            type="button"
            onClick={() => step(100)}
            className={stepper}
            aria-label="Raise the bid by one dollar"
          >
            +
          </button>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-mute">
        <span className="font-semibold text-pop">New listings start at $1.</span>{" "}
        Bidding less than the top price still puts you on the board, at whatever
        place that amount can take.
      </p>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-3xl text-left">
        <div className="grid gap-2.5 sm:grid-cols-[1fr_minmax(0,12rem)_auto]">
          <label className="block">
            <span className="sr-only">Product URL or @handle</span>
            <input
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Your product URL or @handle"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              required
              className="field"
            />
          </label>

          <label className="block">
            <span className="sr-only">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="field"
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={!enabled || pending || belowMinimum || !submission}
            className="pill w-full bg-pop px-9 py-[0.95rem] text-[16px] font-bold text-paper transition hover:bg-[#d9542f] disabled:cursor-not-allowed disabled:bg-popsoft disabled:text-pop/50 sm:w-auto"
          >
            {!enabled ? "Soon" : pending ? "…" : "Outbid"}
          </button>
        </div>

        <label className="mt-2.5 block">
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

        <p className="mt-4 min-h-[2.25rem] text-center text-[14px] leading-snug text-mute">
          {!enabled ? (
            "Bidding opens as soon as payment setup is finished."
          ) : error ? (
            <span className="text-pop">{error}</span>
          ) : belowMinimum ? (
            <span className="text-pop">
              {preview?.onBoard
                ? `That link holds ${formatUsd(preview.currentBidCents)}. Bid at least ${formatUsd(minimum)} to move it up.`
                : "The minimum bid is $1."}
            </span>
          ) : preview?.onBoard ? (
            <>
              <span className="text-ink">{preview.displayName}</span> is already
              listed at {formatUsd(preview.currentBidCents)}. Bidding again
              raises it.
            </>
          ) : (
            <>
              {standing} Already listed? Enter the same URL to raise your bid.
            </>
          )}
        </p>
      </form>
    </section>
  );
}
