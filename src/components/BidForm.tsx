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

export function BidForm({
  priceForFirst,
  enabled,
}: {
  priceForFirst: number;
  /** False until the payment keys are in place. Keeps the form honest. */
  enabled: boolean;
}) {
  const [submission, setSubmission] = useState("");
  const [category, setCategory] = useState("other");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // "take it for $X" links from the board prefill the amount.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("amount");
    if (wanted && Number(wanted) > 0) setAmount(String(Math.floor(Number(wanted))));
  }, []);

  // Resolve the link as they type, so they see what they're actually listing.
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
  const dollars = Math.floor(Number(amount));
  const belowMinimum = amount !== "" && dollars * 100 < minimum;

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
          bidDollars: dollars,
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
    "w-full rounded-xl border-[3px] border-ink bg-paper px-4 py-3.5 text-[16px] font-semibold outline-none transition placeholder:font-normal placeholder:text-mute/70 focus:bg-zap/25";

  return (
    <form id="bid" onSubmit={handleSubmit} className="toon scroll-mt-6 bg-paper p-5 sm:p-6">
      <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-mute">
        List your product
      </p>

      <label className="block">
        <span className="sr-only">Product URL or @handle</span>
        <input
          value={submission}
          onChange={(e) => setSubmission(e.target.value)}
          placeholder="yourproduct.com"
          autoComplete="url"
          spellCheck={false}
          required
          className={`${field} text-center shadow-[4px_4px_0_var(--ink)] sm:text-[17px]`}
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr]">
        <label className="relative block">
          <span className="sr-only">Your bid in dollars</span>
          <span className="tnum pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute">
            $
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder={String(Math.ceil(minimum / 100))}
            required
            className={`${field} tnum pl-8 text-lg font-bold shadow-[4px_4px_0_var(--ink)]`}
          />
        </label>

        <label className="block">
          <span className="sr-only">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${field} shadow-[4px_4px_0_var(--ink)]`}
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Email for the receipt</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email for your receipt (optional)"
          autoComplete="email"
          className={`${field} py-3 text-[15px] shadow-[4px_4px_0_var(--ink)]`}
        />
      </label>

      <button
        type="submit"
        disabled={!enabled || pending || belowMinimum || !submission}
        className="toon press mt-5 w-full bg-pop py-4 font-display text-[19px] font-bold text-paper disabled:cursor-not-allowed"
      >
        {!enabled
          ? "Opening soon"
          : pending
            ? "Opening checkout…"
            : "List my product"}
      </button>

      <p className="mt-3 min-h-[20px] text-center text-sm font-semibold text-mute">
        {!enabled ? (
          "Bidding opens as soon as payment setup is finished. The board below is live."
        ) : error ? (
          <span className="font-bold text-pop">{error}</span>
        ) : belowMinimum ? (
          <span className="font-bold text-pop">
            {preview?.onBoard
              ? `That link holds ${formatUsd(preview.currentBidCents)}. Bid at least ${formatUsd(minimum)} to move it up.`
              : "The minimum bid is $1."}
          </span>
        ) : preview?.onBoard ? (
          <>
            <span className="text-ink">{preview.displayName}</span> is already
            listed at {formatUsd(preview.currentBidCents)}. Bidding again raises
            it.
          </>
        ) : preview ? (
          <>
            Listing <span className="text-ink">{preview.displayName}</span>. One
            payment, no refunds.
          </>
        ) : (
          <>Listing starts at $1. One payment, no refunds, no subscription.</>
        )}
      </p>
    </form>
  );
}
