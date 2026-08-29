import { notFound } from "next/navigation";
import Link from "next/link";
import { CategoryPills } from "@/components/CategoryPills";
import { EntryRow } from "@/components/EntryRow";
import { Pagination } from "@/components/Pagination";
import { CATEGORIES, categoryLabel, SITE_NAME } from "@/lib/config";
import { cachedBoard, cachedCategories, cachedStats } from "@/lib/cache";

// Dynamic because of searchParams; the caching is in @/lib/cache.
export const maxDuration = 60;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const label = categoryLabel(slug);
  return {
    title: label,
    description: `Paid rankings for ${label} on ${SITE_NAME}.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;

  if (!CATEGORIES.some((c) => c.slug === slug)) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const [board, , available] = await Promise.all([
    cachedBoard(page, slug),
    cachedStats(),
    cachedCategories(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <div className="mt-10 pb-3">
        <h1 className="text-[34px] font-bold leading-none tracking-[-0.02em] sm:text-[42px]">
          {categoryLabel(slug)}
        </h1>
        <p className="mt-4 text-[10px] font-semibold tracking-[0.01em] text-dim">
          Positions are board-wide, not category-wide
        </p>
      </div>

      <div className="mt-5">
        <CategoryPills active={slug} available={available} />
      </div>

      {board.rows.length === 0 ? (
        <div className="card mt-6 px-6 py-20 text-center">
          <p className="text-[22px] font-bold tracking-[-0.02em]">
            Nothing listed here yet
          </p>
          <p className="mt-2 text-[14px] text-dim">
            <Link
              href="/#bid"
              className="text-accent underline underline-offset-4"
            >
              List the first one
            </Link>
            {""}
            for a dollar.
          </p>
        </div>
      ) : (
        <>
          <div className="sheet mt-6">
            <div className="sheet-head flex items-center gap-3 px-4 py-3 sm:gap-5 sm:px-5">
              <span className="label hidden w-7 shrink-0 sm:block">Step</span>
              <span className="label flex-1">Listing</span>
              <span className="label hidden w-40 shrink-0 lg:block">
                Category
              </span>
              <span className="label hidden w-24 shrink-0 md:block">
                Traffic
              </span>
              <span className="label w-16 shrink-0 text-right">Bid</span>
              <span className="w-[76px] shrink-0 sm:w-[110px]" aria-hidden />
            </div>
            <ol>
              {board.rows.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </ol>
          </div>
          <Pagination
            page={page}
            pages={board.pages}
            basePath={`/category/${slug}`}
          />
        </>
      )}
    </main>
  );
}
