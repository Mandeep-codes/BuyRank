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
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5 py-12 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight">
        {failed
          ? "That payment didn't go through"
          : sponsor
            ? "The spot is yours"
            : "You're on the board"}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-mute">
        {failed
          ? "Nothing was charged. Head back and try again — the spot is still open."
          : sponsor
            ? "Your card goes up the moment the payment clears — or queues right behind the current rental if one is running."
            : name
              ? "Here's the spot you just took:"
              : `Your listing appears within a few seconds of the payment clearing. If it hasn't shown up after a minute, email us and we'll sort it.`}
      </p>

      {!failed && !sponsor && name ? (
        <SuccessRank name={name} siteName={SITE_NAME} siteUrl={SITE_URL} />
      ) : null}

      <Link
        href="/"
        className="pill mx-auto mt-8 bg-pop px-7 py-3.5 text-[16px] font-bold text-paper transition hover:bg-[#d9542f]"
      >
        {failed ? "Back to the board" : `See it on ${SITE_NAME}`}
      </Link>
    </main>
  );
}
