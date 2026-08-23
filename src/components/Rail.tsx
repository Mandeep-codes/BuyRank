"use client";

import { useEffect, useState } from "react";
import { formatUsd, timeAgo } from "@/lib/format";

type Item = {
  id: string;
  displayName: string;
  amountCents: number;
  createdAt: string;
  entryId: string;
};

/**
 * Live rails flanking the form. They carry the proof that money is actually
 * moving, which is the only thing that convinces a stranger to bid. Drawn as
 * speech bubbles: the board talking about itself.
 */
export function Rail({
  title,
  initial,
  accent,
}: {
  title: string;
  initial: Item[];
  accent: "sun" | "sky";
}) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/activity", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: Item[] };
        if (data.items?.length) setItems(data.items);
      } catch {
        // A dropped poll isn't worth surfacing; the next one catches up.
      }
    }, 20_000);
    return () => clearInterval(id);
  }, []);

  const chip = accent === "sun" ? "bg-zap" : "bg-sky";

  return (
    <aside>
      <p
        className={`toon-sm ${chip} ${accent === "sun" ? "tilt-l" : "tilt-r"} mx-auto mb-6 w-fit px-4 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.14em]`}
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
                <span
                  className={`coin h-9 w-9 shrink-0 text-[11px] ${chip}`}
                  aria-hidden
                >
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
