"use client";

import { useSyncExternalStore } from "react";
import { formatUsd, timeAgo } from "@/lib/format";

type Item = {
  id: string;
  displayName: string;
  amountCents: number;
  createdAt: string;
  entryId: string;
};

/**
 * One horizontal strip of recent bids, replacing the two side rails. Those
 * rails were rendering the same feed twice — identical rows on both sides of
 * the page, which reads as a bug rather than a feature.
 *
 * Single poll shared across every mount: first subscriber starts the timer,
 * last one stops it.
 */
const POLL_MS = 20_000;

let snapshot: Item[] = [];
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

async function poll() {
  if (inFlight) return;
  inFlight = true;
  try {
    const res = await fetch("/api/activity");
    if (!res.ok) return;
    const data = (await res.json()) as { items: Item[] };
    if (Array.isArray(data.items)) {
      snapshot = data.items;
      listeners.forEach((l) => l());
    }
  } catch {
    // A dropped poll isn't worth surfacing; the next one catches up.
  } finally {
    inFlight = false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) timer = setInterval(poll, POLL_MS);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function ActivityStrip({ initial }: { initial: Item[] }) {
  const items = useSyncExternalStore(
    subscribe,
    () => (snapshot.length > 0 ? snapshot : initial),
    () => initial,
  );

  // Nothing to say yet — stay out of the way rather than showing an empty box.
  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <p className="mb-5 text-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-mute">
        Recent bids
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.slice(0, 4).map((item) => (
          <li
            key={item.id}
            className="toon-sm flex items-center gap-3 bg-paper px-3.5 py-3"
          >
            <span className="coin h-9 w-9 shrink-0 bg-zap text-[11px]" aria-hidden>
              {item.displayName.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold leading-tight">
                {item.displayName}
              </span>
              <span className="block text-xs font-semibold text-mute">
                {timeAgo(item.createdAt)}
              </span>
            </span>
            <span className="tnum shrink-0 font-bold text-pop">
              {formatUsd(item.amountCents)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
