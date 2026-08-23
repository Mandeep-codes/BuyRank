import type { Metadata } from "next";
import { Baloo_2, Nunito, Space_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

const display = Baloo_2({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

const body = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
  display: "swap",
});

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
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="min-h-screen antialiased">
        {children}
        <Analytics />
        <footer className="mt-24 border-t-[3px] border-ink bg-zap">
          <div className="mx-auto max-w-6xl px-5 py-8">
            <p className="text-[15px] font-bold">
              Every rank on this board was paid for. Nobody voted.
            </p>
            <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-semibold">
              <Link href="/about" className="underline-offset-4 hover:underline">
                About
              </Link>
              <Link href="/rules" className="underline-offset-4 hover:underline">
                Rules
              </Link>
              <Link href="/terms" className="underline-offset-4 hover:underline">
                Terms of Service
              </Link>
              <Link href="/privacy" className="underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              <Link href="/refunds" className="underline-offset-4 hover:underline">
                Refunds
              </Link>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline-offset-4 hover:underline"
              >
                Contact
              </a>
            </nav>
            <p className="mt-4 text-sm font-semibold text-ink/70">
              Listings start at $1. One-time payment, no subscription. Payments
              handled by Dodo Payments.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
