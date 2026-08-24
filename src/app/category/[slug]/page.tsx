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
  const [board, stats, available] = await Promise.all([
    cachedBoard(page, slug),
    cachedStats(),
    cachedCategories(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/" className="text-2xl font-extrabold font-bold tracking-tight">
        {SITE_NAME}
      </Link>

      <h1 className="mt-10 text-4xl font-extrabold font-bold tracking-tight">
        {categoryLabel(slug)}
      </h1>
      <p className="mt-2 text-[15px] text-mute">
        Ranks shown are positions on the whole board, not within this category.
      </p>

      <div className="mt-8">
        <CategoryPills active={slug} available={available} />
      </div>

      {board.rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-ink/20 bg-paper px-6 py-16 text-center text-mute">
          Nothing listed here yet.{" "}
          <Link href="/#bid" className="text-pop underline underline-offset-4">
            List the first one
          </Link>
          .
        </p>
      ) : (
        <>
          <ol className="mt-6 overflow-hidden rounded-xl border border-ink/20 border-b-0">
            {board.rows.map((entry) => (
              <EntryRow key={entry.id} entry={entry} leaderCents={stats.topCents} />
            ))}
          </ol>
          <Pagination page={page} pages={board.pages} basePath={`/category/${slug}`} />
        </>
      )}
    </main>
  );
}
