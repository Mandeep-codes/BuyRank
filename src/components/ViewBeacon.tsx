"use client";

import { useEffect } from "react";

/**
 * Reports that this set of listings was rendered in front of a real person.
 *
 * Fires once per board per session and only after the tab is actually visible,
 * so a preloaded page or a background tab never counts. Renders nothing.
 */
export function ViewBeacon({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (ids.length === 0) return;

    // One report per distinct board per session. A refresh does not re-count.
    const key = `buyrank_seen_${ids.join(",")}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked. The rate limit is the backstop.
    }

    let sent = false;
    const send = () => {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      fetch("/api/impressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        keepalive: true,
      }).catch(() => {
        // A dropped count is not worth surfacing.
      });
    };

    // A short delay keeps drive-by loads and prefetches out of the number.
    const timer = setTimeout(send, 1200);
    document.addEventListener("visibilitychange", send);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", send);
    };
  }, [ids]);

  return null;
}
