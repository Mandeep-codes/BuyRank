"use client";

import { useSyncExternalStore } from "react";
import { Favicon } from "@/components/Favicon";
import { formatUsd } from "@/lib/format";

type Item = {
  id: string;
  displayName: string;
  faviconUrl?: string | null;
  url?: string;
  amountCents: number;
  createdAt: string;
  entryId: string;
};

/** One poll shared across every mount, started by the first subscriber. */
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

/**
 * Settled payments, newest first — the order money arrived in. No clock: the
 * list is already in time order, and a timestamp on each line only invites the
 * reader to judge the board by how busy it is instead of by what it costs.
 */
export function ActivityStrip({ initial }: { initial: Item[] }) {
  const items = useSyncExternalStore(
    subscribe,
    () => (snapshot.length > 0 ? snapshot : initial),
    () => initial,
  );

  return (
    <aside aria-label="Recent bids" className="card p-4">
      <div className="flex items-center justify-between border-b border-edge pb-2.5">
        <h2 className="label">Money in</h2>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-dim">
          Nothing has settled yet. The first payment shows up here.
        </p>
      ) : (
        <ul>
          {items.slice(0, 8).map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2.5 border-b border-edge/70 py-2.5 last:border-0 last:pb-0"
            >
              <span className="tile h-7 w-7 shrink-0 overflow-hidden">
                <Favicon
                  src={item.faviconUrl ?? null}
                  url={item.url ?? ""}
                  name={item.displayName}
                  size={15}
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                {item.displayName}
              </span>
              <span className="denom shrink-0 text-[15px] font-semibold">
                {formatUsd(item.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
