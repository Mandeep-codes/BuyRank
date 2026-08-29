import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "Rules",
  description: `How ranking, listings and payments work on ${SITE_NAME}.`,
};

const SECTIONS = [
  {
    heading: "How ranking works",
    points: [
      "Rank is decided by your standing bid and nothing else. No votes, no editorial picks, no algorithm.",
      "Bids are whole US dollars. $1 gets you on the board.",
      "You don't have to outbid #1. Whatever you pay, you land wherever that amount places you.",
      "If two listings hold the same amount, the one that got there first ranks higher.",
      "Bid again on the same link at any time to raise it. The new amount replaces the old one — bids don't stack.",
    ],
  },
  {
    heading: "What you can list",
    points: [
      "A product, a company site, a landing page, a portfolio, or your own profile.",
      "Chat and invite links are not allowed — Telegram, WhatsApp, Discord, Messenger, Signal. Link the product, not the group.",
      "Link shorteners and file-sharing links are rejected for the same reason.",
      "One row per destination. Submitting variants of the same URL to hold two spots isn't allowed and gets both removed.",
      "Tracking and affiliate parameters are stripped from whatever you submit.",
    ],
  },
  {
    heading: "Payments",
    points: [
      "Payment is handled by Dodo Payments. Your rank updates when the payment clears, usually within seconds.",
      "Every bid is one-time and final. There are no refunds.",
      "Your money does not come back when someone outbids you. You are buying the position you had, for as long as you held it.",
      "Your rank will fall over time as others bid. That is the entire point of the board.",
      "If something goes wrong with a payment, email us before opening a dispute. We will fix genuine errors.",
    ],
  },
  {
    heading: "Removal",
    points: [
      "Malware, phishing, scams, adult content and anything illegal is removed without a refund.",
      "We may remove any listing at our discretion. This is a small site and that judgement stays with us.",
      "Removed listings keep their payment history but disappear from the board.",
    ],
  },
];

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <h1 className="mt-10 text-[44px] font-bold leading-none tracking-[-0.02em]">
        Rules
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-dim">
        Short version: you pay, you rank, you don&apos;t get it back.
      </p>

      <div className="mt-12 space-y-11 pt-10">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-[22px] font-bold tracking-[-0.02em]">
              {section.heading}
            </h2>
            <ul className="mt-4 space-y-3">
              {section.points.map((point) => (
                <li
                  key={point}
                  className="rounded-2xl bg-wash px-5 py-4 text-[14px] leading-relaxed text-dim"
                >
                  {point}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
