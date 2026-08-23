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
      className="mt-10 flex flex-wrap items-center justify-center gap-2.5"
    >
      {shown.map((p, i) => {
        const gap = i > 0 && p - shown[i - 1] > 1;
        return (
          <span key={p} className="flex items-center gap-2.5">
            {gap ? <span className="font-bold text-mute">&hellip;</span> : null}
            <Link
              href={p === 1 ? basePath : `${basePath}?page=${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`toon-sm press tnum min-w-11 px-3 py-2.5 text-center text-sm font-bold ${
                p === page ? "bg-pop text-paper" : "bg-paper"
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
