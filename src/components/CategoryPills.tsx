import Link from "next/link";
import { CATEGORIES } from "@/lib/config";

/**
 * Horizontal scroll rather than wrapping — 23 categories wrapped into four
 * rows on a phone and pushed the board off the screen.
 */
export function CategoryPills({
  active,
  available,
}: {
  active?: string;
  /** Slugs with at least one listing. Empty filters make a young board look
   *  emptier than it is; when omitted, every category renders. */
  available?: string[];
}) {
  const visible = available
    ? CATEGORIES.filter((c) => available.includes(c.slug) || c.slug === active)
    : CATEGORIES;

  return (
    <nav
      aria-label="Categories"
      className="-mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <Chip href="/" label="All" active={!active} />
      {visible.map((c) => (
        <Chip
          key={c.slug}
          href={`/category/${c.slug}`}
          label={c.label}
          active={active === c.slug}
        />
      ))}
    </nav>
  );
}

function Chip({
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
      className={`chip shrink-0 snap-start ${active ? "chip-on" : ""}`}
    >
      {label}
    </Link>
  );
}
