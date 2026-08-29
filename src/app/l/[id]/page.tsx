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
 * A listing's own page, laid out like the certificate for a position: the
 * amount paid, set large, and the three figures that follow from it. This is
 * what a bidder links when they want to show the rank they bought, and what
 * the OG card renders from.
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
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <p className="label mt-12">Position {entry.rank} · standing bid</p>
      <p
        className="denom mt-4 text-[clamp(3.4rem,13vw,6.5rem)]"
        style={{ "--lum": 1 } as React.CSSProperties}
      >
        {formatUsd(entry.bidCents)}
      </p>

      <div className="mt-8 flex items-start gap-3 pt-6">
        <Favicon
          src={entry.faviconUrl}
          url={entry.url}
          name={entry.displayName}
          size={40}
          className="h-11 w-11 shrink-0 rounded-[10px] bg-paper object-contain p-1.5"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em]">
            {entry.displayName}
          </h1>
          {entry.title ? (
            <p className="mt-0.5 text-[15px] text-dim">{entry.title}</p>
          ) : null}
        </div>
      </div>

      {entry.description ? (
        <p className="mt-5 text-[14px] leading-relaxed text-dim">
          {entry.description}
        </p>
      ) : null}

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-edge bg-wash bg-edge sm:grid-cols-3">
        <Stat label="Position" value={`#${entry.rank}`} />
        <Stat label="Costs to pass" value={formatUsd(takeFor)} />
        <Stat label="Times shown" value={formatCompact(entry.views)} />
        <Stat
          label="Clicks delivered"
          value={formatCompact(entry.clicks)}
          className="col-span-2 sm:col-span-1"
        />
      </dl>

      <div className="mt-7 flex flex-wrap items-center gap-2">
        <Link href={`/?amount=${takeFor / 100}#bid`} className="btn btn-ink">
          Take this spot for {formatUsd(takeFor)}
        </Link>
        <a
          href={`/r/${entry.id}`}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="btn btn-quiet"
        >
          Visit {entry.displayName}
        </a>
      </div>

      <section className="mt-14 pt-8">
        <p className="label">Share this position</p>
        <div className="mt-4">
          <ShareRow
            url={pageUrl}
            text={`${entry.displayName} is #${entry.rank} on ${SITE_NAME} — outbid it if you dare.`}
          />
        </div>
      </section>

      <section className="mt-10 pt-8">
        <p className="label">Embed the live badge</p>
        <p className="mt-2 text-[13px] leading-relaxed text-dim">
          The rank inside the badge updates as the board moves.
        </p>
        <div className="mt-4">
          <CopyBox value={badgeSnippet} />
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`bg-wash px-4 py-4 ${className}`}>
      <dt className="label">{label}</dt>
      <dd className="denom mt-2 text-[24px] text-accent">{value}</dd>
    </div>
  );
}
