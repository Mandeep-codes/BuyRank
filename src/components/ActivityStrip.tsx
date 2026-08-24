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
 * Recent bids, as a column beside the board. One poll shared across every
 * mount — first subscriber starts the timer, last one stops it.
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

  return (
    <aside>
      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-mute">
        Recent bids
      </h2>

      {items.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-mute">
          Nothing yet. The first bid shows up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.slice(0, 7).map((item) => (
            <li
              key={item.id}
              className="toon-sm flex items-center gap-2.5 bg-paper px-3 py-2.5"
            >
              <span className="coin h-8 w-8 shrink-0 bg-zap text-[10px]" aria-hidden>
                {item.displayName.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold leading-tight">
                  {item.displayName}
                </span>
                <span className="block text-[11px] font-semibold text-mute">
                  {timeAgo(item.createdAt)}
                </span>
              </span>
              <span className="tnum shrink-0 text-sm font-bold text-pop">
                {formatUsd(item.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
