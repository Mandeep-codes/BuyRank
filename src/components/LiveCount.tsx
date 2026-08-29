"use client";

import { useEffect, useState } from "react";
import { MIN_ONLINE_TO_SHOW, MIN_VISITORS_TO_SHOW } from "@/lib/config";
import { formatCompact } from "@/lib/format";

const STORAGE_KEY = "buyrank_visitor";
const HEARTBEAT_MS = 60_000;

/** Random, anonymous, generated in the browser. Not derived from anything. */
function visitorToken(): string {
  const make = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  };
  const valid = (t: string | null): t is string =>
    Boolean(t && /^[0-9a-f]{32}$/.test(t));

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (valid(existing)) return existing;
    const token = make();
    localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    // localStorage blocked (private browsing). sessionStorage usually still
    // works, and without it every page load minted a new token — which
    // quietly inflated "visitors since launch". One token per tab is honest.
    try {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (valid(existing)) return existing;
      const token = make();
      sessionStorage.setItem(STORAGE_KEY, token);
      return token;
    } catch {
      return make();
    }
  }
}

/**
 * Live presence: how many browsers are on the site right now, and how many
 * have ever been. Both are real counts of real tokens, which is the whole
 * point of them — the heartbeat is rate limited per IP precisely so the total
 * cannot be run up, and neither figure starts anywhere but zero.
 *
 * Each half stays hidden until it is large enough to read as a crowd. A number
 * that argues against the board is worse than no number, but the fix for that
 * is silence, not a bigger number.
 */
export function LiveCount({
  initialOnline,
  initialTotal,
}: {
  /** Server-rendered starting values, so a refresh never blanks the row. */
  initialOnline: number;
  initialTotal: number;
}) {
  const [counts, setCounts] = useState({
    online: initialOnline,
    total: initialTotal,
  });

  useEffect(() => {
    const id = visitorToken();
    let cancelled = false;

    async function beat() {
      try {
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { online: number; total: number };
        if (!cancelled) setCounts(data);
      } catch {
        // Offline or blocked. Leave the last known numbers alone.
      }
    }

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const showOnline = counts.online >= MIN_ONLINE_TO_SHOW;
  const showTotal = counts.total >= MIN_VISITORS_TO_SHOW;
  if (!showOnline && !showTotal) return null;

  return (
    <span className="flex items-center gap-3 text-[13px] text-dim">
      {showOnline ? (
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          <span className="tnum text-ink">
            {counts.online.toLocaleString("en-US")}
          </span>{" "}
          online
        </span>
      ) : null}
      {showTotal ? (
        <span>
          <span className="tnum text-ink">{formatCompact(counts.total)}</span>{" "}
          visitors
        </span>
      ) : null}
    </span>
  );
}
