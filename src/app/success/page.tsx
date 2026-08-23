import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export const metadata = { title: "Payment received" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const failed = status && status !== "succeeded";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5 text-center">
      <h1 className="font-display text-4xl font-extrabold font-bold tracking-tight">
        {failed ? "That payment didn't go through" : "You're on the board"}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-mute">
        {failed
          ? "Nothing was charged. Head back and try again — the spot is still open."
          : `Your listing appears within a few seconds of the payment clearing. If it hasn't shown up after a minute, email us and we'll sort it.`}
      </p>
      <Link
        href="/"
        className="mx-auto mt-8 rounded-lg bg-pop px-6 py-3 text-[15px] font-medium text-paper transition hover:bg-pop"
      >
        {failed ? "Back to the board" : `See it on ${SITE_NAME}`}
      </Link>
    </main>
  );
}
