"use client";

import { useEffect, useState } from "react";
import { MIN_ONLINE_TO_SHOW } from "@/lib/config";

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

export function LiveCount({
  initialOnline,
  initialTotal,
}: {
  /** Server-rendered starting values, so a refresh never blanks the pill. */
  initialOnline: number;
  initialTotal: number;
}) {
  const [counts, setCounts] = useState<{ online: number; total: number }>({
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

  // "2 online" argues against the site; the count appears once it reads as
  // strength. Nothing is padded — the segment just waits its turn.
  const showOnline = counts.online >= MIN_ONLINE_TO_SHOW;

  return (
    <>
      {showOnline ? (
        <>
          <span className="flex items-center gap-1.5">
            <span className="blink h-1.5 w-1.5 rounded-full bg-mint" aria-hidden />
            <span className="tnum font-semibold text-mint">
              {counts.online.toLocaleString("en-US")} online
            </span>
          </span>
          <span aria-hidden>&middot;</span>
        </>
      ) : null}
      <span>
        <span className="tnum font-semibold text-ink">
          {counts.total.toLocaleString("en-US")}
        </span>{" "}
        visitors since launch
      </span>
    </>
  );
}
