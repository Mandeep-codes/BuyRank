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

  const field =
    "w-full rounded-xl border-[2.5px] border-ink bg-paper px-4 py-3 text-[16px] font-semibold outline-none transition placeholder:font-normal placeholder:text-mute/70 focus:bg-zap/20";

  // 16px minimum on inputs, or iOS Safari zooms the page on focus.
  const stepper =
    "coin h-11 w-11 shrink-0 bg-paper text-2xl leading-none active:translate-y-[2px] active:shadow-none disabled:opacity-30";

  return (
    <section id="bid" className="scroll-mt-4 text-center">
      <h1 className="font-display text-[clamp(1.75rem,7vw,3.25rem)] font-extrabold leading-tight tracking-tight">
        Claim #1 for
      </h1>

      <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => step(-100)}
          disabled={amountCents <= minimum}
          className={stepper}
          aria-label="Lower the bid by one dollar"
        >
          &minus;
        </button>

        <span className="tnum min-w-[4.5ch] font-display text-[clamp(2.5rem,12vw,4.5rem)] font-extrabold leading-none text-pop">
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

      <p className="mx-auto mt-5 max-w-md text-[15px] font-semibold leading-relaxed text-mute">
        <span className="text-pop">New listings start at $1.</span> Bidding less
        than the top price still puts you on the board, at whatever place that
        amount can take.
      </p>

      <form onSubmit={handleSubmit} className="mx-auto mt-7 max-w-2xl text-left">
        <div className="grid gap-2.5 sm:grid-cols-[1fr_minmax(0,11rem)_auto]">
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
              className={field}
            />
          </label>

          <label className="block">
            <span className="sr-only">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={field}
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
            className="press w-full bg-pop px-7 py-3 font-display text-lg font-extrabold text-paper disabled:cursor-not-allowed disabled:bg-mute/40 sm:w-auto"
          >
            {!enabled ? "Soon" : pending ? "…" : "Bid"}
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
            className={`${field} py-2.5`}
          />
        </label>

        <p className="mt-3 min-h-[2.5rem] text-center text-[13px] font-semibold leading-snug text-mute">
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
