"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "buyrank_visitor";
const HEARTBEAT_MS = 90_000;

/** Random, anonymous, generated in the browser. Not derived from anything. */
function visitorToken(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && /^[0-9a-f]{32}$/.test(existing)) return existing;
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    // Private browsing with storage disabled — still count as online, just
    // don't persist, so this visit shows up once and expires.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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

    // Beat again when the tab comes back, so returning readers show as online.
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

  // Render nothing until the first response, so the header doesn't flash a zero.
  if (!counts) return null;

  return (
    <>
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <span className="blink h-2 w-2 rounded-full bg-mint" aria-hidden />
        <span className="tnum font-bold">
          {counts.online.toLocaleString("en-US")}
        </span>
        <span className="text-mute">online</span>
      </span>
      <span className="hidden items-center gap-1.5 text-sm font-semibold sm:flex">
        <span className="tnum font-bold">
          {counts.total.toLocaleString("en-US")}
        </span>
        <span className="text-mute">visitors</span>
      </span>
    </>
  );
}
