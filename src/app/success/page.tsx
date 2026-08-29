import Link from "next/link";
import { SuccessRank } from "@/components/SuccessRank";
import { SITE_NAME, SITE_URL } from "@/lib/config";

export const metadata = { title: "Payment received" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; u?: string; sponsor?: string }>;
}) {
  const { status, u, sponsor } = await searchParams;
  const failed = status && status !== "succeeded";
  const name = typeof u === "string" && u.length <= 200 ? u : null;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12 sm:px-6">
      <p className="label">
        {failed
          ? "Payment declined"
          : sponsor
            ? "Placement booked"
            : "Bid settled"}
      </p>

      <h1 className="mt-4 text-[38px] font-bold leading-[1.05] tracking-[-0.02em]">
        {failed
          ? "That payment didn't go through"
          : sponsor
            ? "The spot is yours"
            : "You're on the board"}
      </h1>

      <p className="mt-4 max-w-md text-[14px] leading-relaxed text-dim">
        {failed
          ? "Nothing was charged. Head back and try again — the spot is still open."
          : sponsor
            ? "Your card goes up the moment the payment clears, or queues behind the current rental if one is running."
            : name
              ? "Here's the spot you just took."
              : "Your listing appears within a few seconds of the payment clearing. If it hasn't shown up after a minute, email us and we'll sort it."}
      </p>

      {!failed && !sponsor && name ? (
        <SuccessRank name={name} siteName={SITE_NAME} siteUrl={SITE_URL} />
      ) : null}

      <div className="mt-8">
        <Link href="/" className="btn btn-ink">
          {failed ? "Back to the board" : `See it on ${SITE_NAME}`}
        </Link>
      </div>
    </main>
  );
}
