import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "About",
  description: `What ${SITE_NAME} is and why it exists.`,
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-2xl font-extrabold font-bold tracking-tight">
        {SITE_NAME}
      </Link>

      <h1 className="mt-12 text-5xl font-extrabold font-bold tracking-tight">
        About
      </h1>

      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-mute">
        <p>
          Every directory claims its ranking is earned. Upvotes, launch days,
          editorial curation, mysterious relevance scores. Underneath most of
          them, the top spots still go to whoever spent the most — on ads, on
          agencies, on getting their launch coordinated.
        </p>
        <p>
          <span className="text-ink">{SITE_NAME}</span> removes the pretense. The
          ranking is the price. Pay more than the listing above you and you take
          its place. That&apos;s the whole mechanism, and it&apos;s printed on
          every row.
        </p>
        <p>
          What you get is a link, a description pulled from your own page, and a
          click counter so you can see exactly what the money bought. What you
          don&apos;t get is your money back when the next person outbids you.
        </p>
        <p>
          It is a leaderboard, an ad slot, and a small joke about how attention
          is priced — all at the same time. Everyone bidding knows this.
        </p>
        <p>
          Questions, removals, or a payment that went sideways:{" "}
          <Link href="/rules" className="text-pop underline underline-offset-4">
            read the rules
          </Link>{" "}
          first, then get in touch.
        </p>
      </div>
    </main>
  );
}
