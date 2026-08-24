import Link from "next/link";

export function Pagination({
  page,
  pages,
  basePath,
}: {
  page: number;
  pages: number;
  basePath: string;
}) {
  if (pages <= 1) return null;

  const near = [page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages);
  const shown = Array.from(new Set([1, ...near, pages])).sort((a, b) => a - b);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      {shown.map((p, i) => {
        const gap = i > 0 && p - shown[i - 1] > 1;
        return (
          <span key={p} className="flex items-center gap-2">
            {gap ? <span className="px-1 text-mute">…</span> : null}
            <Link
              href={p === 1 ? basePath : `${basePath}?page=${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`tnum min-w-10 rounded-full px-3.5 py-2 text-center text-sm font-semibold transition ${
                p === page
                  ? "bg-pop text-paper"
                  : "bg-wash text-mute hover:bg-popsoft hover:text-pop"
              }`}
            >
              {p}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
