"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

type ClickItem = {
  id: string;
  displayName: string;
  faviconUrl: string | null;
  createdAt: string;
};

/**
 * A single rotating line of real outbound clicks: "acme.com got a click just
 * now". The server only returns events from the last 24 hours, so when the
 * board is quiet this renders nothing at all — a visible-but-stale ticker
 * would read worse than its absence.
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
    <p className="mt-2.5 px-4 text-center" aria-live="off">
      <span
        key={item.id}
        className="ticker-item inline-flex max-w-full items-center gap-2 text-[13px] text-mute"
      >
        <span className="blink h-1.5 w-1.5 shrink-0 rounded-full bg-pop" aria-hidden />
        <span className="truncate">
          <span className="font-bold text-ink">{item.displayName}</span> got a
          click {timeAgo(item.createdAt)}
        </span>
      </span>
    </p>
  );
}
