"use client";

import { useEffect, useState } from "react";

type ClickItem = {
  id: string;
  displayName: string;
  faviconUrl: string | null;
  createdAt: string;
};

/**
 * Real outbound clicks, one at a time, directly under the masthead — proof
 * that the money buys something. The server only returns events from the last
 * 24 hours, so a quiet board renders no band at all; a stale ticker reads
 * worse than none.
 */
export function ClickTicker({ initial }: { initial: ClickItem[] }) {
  const [items, setItems] = useState(initial);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const refresh = setInterval(async () => {
      try {
        const res = await fetch("/api/activity");
        if (!res.ok) return;
        const data = (await res.json()) as { clicks?: ClickItem[] };
        if (Array.isArray(data.clicks)) setItems(data.clicks);
      } catch {
        // Keep rotating what we have.
      }
    }, 30_000);
    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const rotate = setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      4_500,
    );
    return () => clearInterval(rotate);
  }, [items.length]);

  const item = items[index % Math.max(1, items.length)];
  if (!item) return null;

  return (
    <div className="relative z-30 border-b border-edge bg-wash" aria-live="off">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
          aria-hidden
        />
        <p
          key={item.id}
          className="min-w-0 truncate text-[13px] font-medium text-dim"
        >
          <span className="text-ink">{item.displayName}</span> got a click
        </p>
      </div>
    </div>
  );
}
