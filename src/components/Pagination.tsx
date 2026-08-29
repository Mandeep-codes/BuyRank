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
      className="mt-8 flex flex-wrap items-center gap-1.5"
    >
      {shown.map((p, i) => {
        const gap = i > 0 && p - shown[i - 1] > 1;
        return (
          <span key={p} className="flex items-center gap-1.5">
            {gap ? <span className="px-1 text-[11px] text-dim">…</span> : null}
            <Link
              href={p === 1 ? basePath : `${basePath}?page=${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`chip tnum justify-center px-3 ${p === page ? "chip-on" : ""}`}
            >
              {p}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
