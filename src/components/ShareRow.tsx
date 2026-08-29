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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={x}
        target="_blank"
        rel="noopener"
        className="btn btn-quiet py-2.5"
      >
        Post on X
      </a>
      <a
        href={wa}
        target="_blank"
        rel="noopener"
        className="btn btn-quiet py-2.5"
      >
        WhatsApp
      </a>
      <button type="button" onClick={copy} className="btn btn-quiet py-2.5">
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
