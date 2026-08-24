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
 * Both rails show the same feed, so they share one poll instead of running an
 * interval each. First rail to mount starts the timer, last to unmount stops
 * it — so this stays at one request per 20s no matter how many rails render.
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
  if (listeners.size === 1) {
    timer = setInterval(poll, POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function Rail({
  title,
  initial,
  accent,
}: {
  title: string;
  initial: Item[];
  accent: "zap" | "sky";
}) {
  // Fall back to the server-rendered list until the first poll lands. Reading
  // rather than assigning keeps render pure.
  const items = useSyncExternalStore(
    subscribe,
    () => (snapshot.length > 0 ? snapshot : initial),
    () => initial,
  );

  const chip = accent === "zap" ? "bg-zap" : "bg-sky";

  return (
    <aside>
      <p
        className={`toon-sm ${chip} ${accent === "zap" ? "tilt-l" : "tilt-r"} mx-auto mb-6 w-fit px-4 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.14em]`}
      >
        {title}
      </p>

      {items.length === 0 ? (
        <p className="text-center text-sm font-semibold text-mute">
          Nothing yet. The first bid shows up here.
        </p>
      ) : (
        <ul className="space-y-5">
          {items.slice(0, 6).map((item, i) => (
            <li
              key={item.id}
              className={`bubble px-3.5 py-3 ${i % 2 ? "tilt-r" : "tilt-l"}`}
            >
              <div className="flex items-center gap-3">
                <span className={`coin h-9 w-9 shrink-0 text-[11px] ${chip}`} aria-hidden>
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
                <span className="tnum shrink-0 text-lg font-bold text-pop">
                  {formatUsd(item.amountCents)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
