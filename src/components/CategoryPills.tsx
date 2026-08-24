import Link from "next/link";
import { CATEGORIES } from "@/lib/config";

/**
 * Horizontal scroll rather than wrapping — 23 categories wrapped into four
 * rows on a phone and pushed the board off the screen.
 */
export function CategoryPills({ active }: { active?: string }) {
  return (
    <nav
      aria-label="Categories"
      className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <Pill href="/" label="All" active={!active} />
      {CATEGORIES.map((c) => (
        <Pill
          key={c.slug}
          href={`/category/${c.slug}`}
          label={c.label}
          active={active === c.slug}
        />
      ))}
    </nav>
  );
}

function Pill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition ${
        active
          ? "bg-pop text-paper"
          : "bg-wash text-mute hover:bg-popsoft hover:text-pop"
      }`}
    >
      {label}
    </Link>
  );
}
