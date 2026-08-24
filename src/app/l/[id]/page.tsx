import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyBox } from "@/components/CopyBox";
import { Favicon } from "@/components/Favicon";
import { ShareRow } from "@/components/ShareRow";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { formatCompact, formatUsd } from "@/lib/format";
import { getEntryWithRank, priceToBeat } from "@/lib/queries";

/** Ranks move; a minute of staleness is fine, a build-time snapshot is not. */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = await getEntryWithRank(id).catch(() => null);
  if (!entry) return { title: `Not listed — ${SITE_NAME}` };
  return {
    title: `${entry.displayName} — #${entry.rank} on ${SITE_NAME}`,
    description: `Holding #${entry.rank} at ${formatUsd(entry.bidCents)}. Outbid it and the spot is yours.`,
  };
}

/**
 * The listing's own page: what a bidder links when they want to show off the
 * rank they bought, and what the OG card renders from. Also carries the
 * embeddable badge — a live backlink from their site to this one.
 */
export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const entry = await getEntryWithRank(id).catch(() => null);
  if (!entry) notFound();

  const pageUrl = `${SITE_URL}/l/${entry.id}`;
  const takeFor = priceToBeat(entry.bidCents);
  const badgeSnippet = `<a href="${pageUrl}"><img src="${SITE_URL}/api/badge/${entry.id}" alt="#${entry.rank} on ${SITE_NAME}" height="44"></a>`;

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-center">
      <Link href="/" className="text-[15px] font-bold text-mute transition hover:text-ink">
        &larr; {SITE_NAME}
      </Link>

      <p className="rank mx-auto mt-8 h-16 w-20 text-2xl">#{entry.rank}</p>

      <span className="mx-auto mt-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-cardline bg-paper shadow-sm">
        <Favicon
          src={entry.faviconUrl}
          url={entry.url}
          name={entry.displayName}
          size={34}
        />
      </span>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
        {entry.displayName}
      </h1>
      {entry.title ? (
        <p className="mt-1 text-[16px] font-semibold text-mute">{entry.title}</p>
      ) : null}
      {entry.description ? (
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-mute">
          {entry.description}
        </p>
      ) : null}

      <p className="tnum mt-5 text-[15px] font-semibold text-mute">
        Holding #{entry.rank} at{" "}
        <span className="text-ink">{formatUsd(entry.bidCents)}</span> &middot;{" "}
        {formatCompact(entry.clicks)} clicks delivered
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <a
          href={`/r/${entry.id}`}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="pill border border-cardline bg-paper px-6 py-3 text-[15px] font-bold transition hover:border-pop"
        >
          Visit {entry.displayName}
        </a>
        <Link
          href={`/?amount=${takeFor / 100}#bid`}
          className="pill bg-pop px-6 py-3 text-[15px] font-bold text-paper transition hover:bg-[#d9542f]"
        >
          Take this spot for {formatUsd(takeFor)}
        </Link>
      </div>

      <div className="mt-10 border-t border-rule pt-8">
        <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-mute">
          Share this rank
        </p>
        <div className="mt-4">
          <ShareRow
            url={pageUrl}
            text={`${entry.displayName} is #${entry.rank} on ${SITE_NAME} — outbid it if you dare.`}
          />
        </div>
      </div>

      <div className="mt-9 text-left">
        <p className="text-center text-[13px] font-bold uppercase tracking-[0.1em] text-mute">
          Embed the live badge
        </p>
        <p className="mt-2 text-center text-[13px] text-mute">
          The rank in the badge updates as the board moves.
        </p>
        <div className="mt-4">
          <CopyBox value={badgeSnippet} />
        </div>
      </div>
    </main>
  );
}
