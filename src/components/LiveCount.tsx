"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "buyrank_visitor";
const HEARTBEAT_MS = 90_000;

/** Random, anonymous, generated in the browser. Not derived from anything. */
function visitorToken(): string {
  const make = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  };
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && /^[0-9a-f]{32}$/.test(existing)) return existing;
    const token = make();
    localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    // Private browsing with storage disabled — still count, just don't persist.
    return make();
  }
}

export function LiveCount() {
  const [counts, setCounts] = useState<{ online: number; total: number } | null>(
    null,
  );

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

  // Render nothing until the first response, so the pill never flashes a zero.
  if (!counts) return null;

  return (
    <>
      <span className="flex items-center gap-1.5">
        <span className="blink h-1.5 w-1.5 rounded-full bg-mint" aria-hidden />
        <span className="tnum font-semibold text-mint">
          {counts.online.toLocaleString("en-US")} online
        </span>
      </span>
      <span aria-hidden>&middot;</span>
      <span>
        <span className="tnum font-semibold text-ink">
          {counts.total.toLocaleString("en-US")}
        </span>{" "}
        visitors since launch
      </span>
    </>
  );
}
