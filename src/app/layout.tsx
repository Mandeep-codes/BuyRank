import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

// One family throughout, the way the reference does it — weight carries the
// hierarchy instead of a second face.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${sans.variable}`}
    >
      <body className="min-h-screen antialiased">
        {children}
        <footer className="mt-24 border-t border-rule">
          <div className="mx-auto max-w-5xl px-4 py-9 sm:px-5">
            <p className="text-[15px] font-semibold">
              Every rank on this board was paid for. Nobody voted.
            </p>
            <nav className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-mute">
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
            <p className="mt-4 text-sm text-mute">
              Listings start at $1. One-time payment, no subscription. Payments
              handled by Dodo Payments.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
