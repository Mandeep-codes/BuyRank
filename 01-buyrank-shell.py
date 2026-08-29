#!/usr/bin/env python3
# BuyRank redesign - palette, stylesheet, type system, root layout
# Run from the repo root. Idempotent: re-running prints "same" and writes nothing.
import os, sys

if not os.path.isdir("src/app"):
    sys.exit("run this from the repo root (the folder holding package.json)")

FILES = {}
DELETE = []

FILES['tailwind.config.ts'] = r"""import type { Config } from "tailwindcss";

/**
 * Every colour resolves through a CSS variable rather than a literal, so the
 * whole site repaints from the palette block at the top of globals.css. Names
 * are about role, not hue.
 */
const themed = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: themed("paper"), // the page
        wash: themed("wash"), // table headers, inset fills
        edge: themed("edge"), // hairlines
        ink: themed("ink"), // primary text and solid buttons
        dim: themed("dim"), // secondary text
        accent: themed("accent"), // the one warm note
        accentwash: themed("accentwash"),
        // The white solid in the middle of the page, lit from above.
        face1: themed("face1"), // treads
        face2: themed("face2"), // risers
        face3: themed("face3"), // side wall
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
"""

FILES['src/app/globals.css'] = r"""@tailwind base;
@tailwind utilities;
@tailwind components;

/* ---- Palette --------------------------------------------------------------
   White page, near-black ink, hairline greys, and one warm note reserved for
   the claim action. Channels are raw RGB triples so they work both as plain
   colours and inside rgb(... / alpha).
   --------------------------------------------------------------------------- */

:root {
  --paper-rgb: 255, 255, 255;
  --wash-rgb: 250, 250, 250;
  --edge-rgb: 233, 233, 233;
  --ink-rgb: 17, 17, 17;
  --dim-rgb: 140, 140, 140;
  --accent-rgb: 176, 128, 12;
  --accentwash-rgb: 253, 247, 229;

  /* The solid. Three greys for three planes, lit from above. */
  --face1-rgb: 247, 247, 247;
  --face2-rgb: 233, 233, 233;
  --face3-rgb: 219, 219, 219;

  --paper: rgb(var(--paper-rgb));
  --wash: rgb(var(--wash-rgb));
  --edge: rgb(var(--edge-rgb));
  --ink: rgb(var(--ink-rgb));
  --dim: rgb(var(--dim-rgb));
  --accent: rgb(var(--accent-rgb));
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
    background: var(--paper);
  }

  html,
  body {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: hidden;
  }

  body {
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-sans), system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  main,
  section,
  header,
  footer,
  nav,
  ol,
  ul,
  li,
  form,
  article,
  aside,
  div {
    min-width: 0;
    max-width: 100%;
  }

  img,
  svg,
  video,
  canvas,
  input,
  select,
  textarea,
  button {
    max-width: 100%;
  }

  ::selection {
    background: var(--ink);
    color: var(--paper);
  }

  :focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
}

@layer components {
  /* Small caps set in mono. Every column head and rail heading on the page is
     one of these; they are the only uppercase text anywhere. */
  .label {
    font-family: var(--font-mono), ui-monospace, monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--dim);
  }

  .tnum {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
  }

  .denom {
    font-family: var(--font-display), system-ui, sans-serif;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  /* A card: white, one hairline, barely any shadow. */
  .card {
    background: var(--paper);
    border: 1px solid var(--edge);
    border-radius: 14px;
  }

  /* The square that holds a logo or a plus sign. */
  .tile {
    display: grid;
    place-items: center;
    border: 1px solid var(--edge);
    border-radius: 10px;
    background: var(--paper);
    color: var(--dim);
  }

  /* ---- Controls ---------------------------------------------------------- */

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border: 1px solid transparent;
    border-radius: 9px;
    padding: 0.6rem 1.1rem;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.005em;
    line-height: 1.2;
    white-space: nowrap;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      color 150ms ease,
      opacity 150ms ease;
  }

  /* Solid ink. The action that takes something from somebody. */
  .btn-ink {
    background: var(--ink);
    color: var(--paper);
  }

  .btn-ink:hover:not(:disabled) {
    background: rgb(var(--ink-rgb) / 0.85);
  }

  .btn-ink:disabled {
    background: rgb(var(--ink-rgb) / 0.2);
    cursor: not-allowed;
  }

  /* The warm one. Claiming something nobody holds yet. */
  .btn-claim {
    background: var(--accentwash);
    border-color: rgb(var(--accent-rgb) / 0.22);
    color: var(--accent);
  }

  .btn-claim:hover:not(:disabled) {
    background: rgb(var(--accent-rgb) / 0.16);
  }

  .btn-claim:disabled {
    color: rgb(var(--accent-rgb) / 0.45);
    cursor: not-allowed;
  }

  .btn-quiet {
    background: var(--paper);
    border-color: var(--edge);
    color: var(--ink);
  }

  .btn-quiet:hover:not(:disabled) {
    background: var(--wash);
  }

  .btn-quiet:disabled {
    color: var(--dim);
    cursor: not-allowed;
  }

  .field {
    width: 100%;
    border: 1px solid var(--edge);
    border-radius: 10px;
    background: var(--paper);
    padding: 0.8rem 0.95rem;
    /* 16px, or iOS Safari zooms the page on focus. */
    font-size: 16px;
    color: var(--ink);
    outline: none;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .field::placeholder {
    color: var(--dim);
  }

  .field:focus {
    border-color: rgb(var(--ink-rgb) / 0.45);
    box-shadow: 0 0 0 3px rgb(var(--ink-rgb) / 0.06);
  }

  .step {
    display: grid;
    place-items: center;
    border: 1px solid var(--edge);
    border-radius: 10px;
    background: var(--paper);
    color: var(--ink);
    line-height: 1;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .step:hover:not(:disabled) {
    background: var(--wash);
    border-color: rgb(var(--ink-rgb) / 0.3);
  }

  .step:disabled {
    color: rgb(var(--dim-rgb) / 0.6);
    cursor: not-allowed;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--edge);
    border-radius: 999px;
    background: var(--paper);
    padding: 0.4rem 0.85rem;
    font-size: 13px;
    font-weight: 500;
    color: var(--dim);
    white-space: nowrap;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      border-color 150ms ease;
  }

  .chip:hover {
    background: var(--wash);
    color: var(--ink);
  }

  .chip-on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--paper);
  }

  .chip-on:hover {
    background: var(--ink);
    color: var(--paper);
  }

  /* ---- The table --------------------------------------------------------- */

  .sheet {
    border: 1px solid var(--edge);
    border-radius: 14px;
    overflow: hidden;
    background: var(--paper);
  }

  .sheet-head {
    background: var(--wash);
    border-bottom: 1px solid var(--edge);
  }

  .sheet-row + .sheet-row {
    border-top: 1px solid var(--edge);
  }

  .sheet-row {
    transition: background-color 150ms ease;
  }

  .sheet-row:hover {
    background: var(--wash);
  }

  /* ---- The solid --------------------------------------------------------- */

  .step3d {
    cursor: pointer;
  }

  .step3d:focus {
    outline: none;
  }

  /* The lift lives on its own group so the entry animation above it, which
     carries a fill mode, cannot win against the hover rule. */
  .step3d-lift {
    transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .step3d:hover .step3d-lift,
  .step3d:focus-visible .step3d-lift {
    transform: translate(0, -9px);
  }

  .step3d-hl {
    opacity: 0;
    transition: opacity 220ms ease;
  }

  .step3d:hover .step3d-hl,
  .step3d:focus-visible .step3d-hl {
    opacity: 1;
  }

  .step3d-tag {
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
  }

  .step3d:hover .step3d-tag,
  .step3d:focus-visible .step3d-tag {
    opacity: 1;
  }

  /* The flight assembles itself from the bottom step up on first paint. */
  .climb {
    animation: climb 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(var(--i, 0) * 55ms);
  }

  @keyframes climb {
    from {
      opacity: 0;
      transform: translate(0, 22px);
    }
    to {
      opacity: 1;
      transform: translate(0, 0);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .climb {
    opacity: 1 !important;
    transform: none !important;
  }

  .step3d:hover .step3d-lift,
  .step3d:focus-visible .step3d-lift {
    transform: none;
  }
}
"""

FILES['src/app/layout.tsx'] = r"""import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Outfit } from "next/font/google";
import Link from "next/link";
import {
  CONTACT_EMAIL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/config";
import "./globals.css";

/**
 * Three roles. Outfit's geometric numerals carry the headings and every price,
 * Inter does the reading, and Plex Mono is reserved for the small caps column
 * heads and the index numbers down the left of the table.
 */
const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — rank is bought, not earned`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen antialiased">
        {children}

        <footer className="mt-24 border-t border-edge">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="max-w-lg font-display text-[20px] font-semibold leading-snug tracking-[-0.02em]">
                Every step on this staircase was paid for.{" "}
                <span className="text-dim">Nobody voted.</span>
              </p>
              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-dim">
                Listings start at $1. One payment, no subscription, and no
                refund when the next person outbids you. Payments handled by
                Dodo Payments.
              </p>
            </div>

            <nav className="grid gap-2.5 md:justify-items-end">
              <p className="label">Index</p>
              {[
                { href: "/about", label: "About" },
                { href: "/rules", label: "Rules" },
                { href: "/terms", label: "Terms" },
                { href: "/privacy", label: "Privacy" },
                { href: "/refunds", label: "Refunds" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[13px] text-dim transition hover:text-ink"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[13px] text-dim transition hover:text-ink"
              >
                Contact
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
"""


changed = 0
for path in DELETE:
    if os.path.exists(path):
        os.remove(path)
        print("removed", path)
        changed += 1

for path, body in FILES.items():
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
    if old == body:
        print("same  ", path)
        continue
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(body)
    print("new   " if old is None else "wrote ", path)
    changed += 1

print()
print(f"{changed} change(s) applied")
