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
      <pre className="overflow-x-auto rounded-xl border border-cardline bg-paper px-4 py-3 pr-20 text-left text-[12px] leading-relaxed text-mute">
        {value}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="pill absolute right-2 top-2 border border-cardline bg-wash px-3 py-1 text-[12px] font-bold transition hover:border-pop"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
