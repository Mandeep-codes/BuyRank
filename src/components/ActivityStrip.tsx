"use client";

import { useSyncExternalStore } from "react";
import { Favicon } from "@/components/Favicon";
import { formatUsd, timeAgo } from "@/lib/format";

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

export function ActivityStrip({ initial }: { initial: Item[] }) {
  const items = useSyncExternalStore(
    subscribe,
    () => (snapshot.length > 0 ? snapshot : initial),
    () => initial,
  );

  return (
    <aside aria-label="Recent bids">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-mute">
        Recent bids
      </h2>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-mute">
          Nothing yet. The first bid shows up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.slice(0, 7).map((item) => (
            <li key={item.id} className="card flex items-center gap-3 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cardline bg-paper">
                <Favicon
                  src={item.faviconUrl ?? null}
                  url={item.url ?? ""}
                  name={item.displayName}
                  size={20}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold leading-tight">
                  {item.displayName}
                </span>
                <span className="block text-[12px] text-mute">
                  {timeAgo(item.createdAt)}
                </span>
              </span>
              <span className="tnum shrink-0 text-[15px] font-extrabold text-pop">
                {formatUsd(item.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
