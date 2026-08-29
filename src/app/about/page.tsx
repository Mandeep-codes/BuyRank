import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "About",
  description: `What ${SITE_NAME} is and why it exists.`,
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <h1 className="mt-10 text-[44px] font-bold leading-none tracking-[-0.02em]">
        About
      </h1>
      <p className="mt-5 max-w-lg text-[19px] font-semibold leading-snug tracking-[-0.01em] text-dim">
        A directory that tells you the truth about how it ranks things.
      </p>

      <div className="mt-10 space-y-5 pt-8 text-[14px] leading-relaxed text-dim">
        <p>
          Every directory claims its ranking is earned. Upvotes, launch days,
          editorial curation, mysterious relevance scores. Underneath most of
          them, the top spots still go to whoever spent the most — on ads, on
          agencies, on getting their launch coordinated.
        </p>
        <p>
          <span className="font-semibold text-ink">{SITE_NAME}</span> removes
          the pretense. The ranking is the price. Pay more than the listing
          above you and you take its place. That is the whole mechanism, and it
          is printed on every row: the price is set in type as big as the money
          it represents, so the shape of the board is the shape of the market.
        </p>
        <p>
          What you get is a link, a description pulled from your own page, and a
          click counter so you can see exactly what the money bought. What you
          don&apos;t get is your money back when the next person outbids you.
        </p>
        <p>
          There are no dates anywhere on the board on purpose. How long
          something has been listed tells you nothing about where it deserves to
          sit. Only the number does.
        </p>
        <p>
          It is a leaderboard, an ad slot, and a small joke about how attention
          is priced, all at once. Everyone bidding knows this.
        </p>
        <p>
          Questions, removals, or a payment that went sideways:{""}
          <Link
            href="/rules"
            className="text-accent underline underline-offset-4"
          >
            read the rules
          </Link>
          {""}
          first, then get in touch.
        </p>
      </div>
    </main>
  );
}
