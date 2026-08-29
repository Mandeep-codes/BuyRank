"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { faviconProxy, hostOf } from "@/lib/favicon";

/**
 * Product icon with a fallback chain: the stored icon, then Google's proxy
 * for the domain, then a letter tile. A broken image never renders — old
 * rows with dead icon URLs heal themselves at view time.
 */
export function Favicon({
  src,
  url,
  name,
  className,
  size = 44,
}: {
  src: string | null;
  url: string;
  name: string;
  className?: string;
  size?: number;
}) {
  const host = hostOf(url);
  const chain = [src, host ? faviconProxy(host) : null].filter(
    (u): u is string => Boolean(u),
  );
  const [step, setStep] = useState(0);

  if (step >= chain.length) {
    return (
      <span
        className={`flex items-center justify-center font-bold text-dim ${className ?? ""}`}
        style={{ fontSize: Math.max(12, Math.floor(size * 0.42)) }}
        aria-hidden
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={chain[step]}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setStep((n) => n + 1)}
      className={className}
    />
  );
}
