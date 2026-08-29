"use client";

import { useState } from "react";

/** A code snippet with a copy button. Used for the embeddable badge. */
export function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the snippet is selectable below.
    }
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-edge bg-wash px-3.5 py-3 pr-24 text-left font-mono text-[11px] leading-relaxed text-dim">
        {value}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="btn btn-quiet absolute right-2 top-2 px-3 py-1.5 text-[12px]"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
