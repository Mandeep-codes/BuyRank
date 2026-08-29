import type { Metadata, Viewport } from "next";
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
