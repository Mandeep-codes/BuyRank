"use client";

import { useState } from "react";

/** X / WhatsApp / copy — the three places this audience actually shares. */
export function ShareRow({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the link is visible on the page anyway.
    }
  }

  const pill =
    "pill px-4 py-2 text-[13px] font-bold transition border border-cardline bg-paper hover:border-pop";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <a href={x} target="_blank" rel="noopener" className={pill}>
        Post on X
      </a>
      <a href={wa} target="_blank" rel="noopener" className={pill}>
        WhatsApp
      </a>
      <button type="button" onClick={copy} className={pill}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
