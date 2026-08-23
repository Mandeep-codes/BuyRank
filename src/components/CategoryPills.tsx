import Link from "next/link";
import { CATEGORIES } from "@/lib/config";

export function CategoryPills({ active }: { active?: string }) {
  return (
    <nav
      aria-label="Categories"
      className="flex snap-x gap-2.5 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
      className={`toon-sm press shrink-0 snap-start whitespace-nowrap px-3.5 py-2 text-xs font-bold ${
        active ? "bg-pop text-paper" : "bg-paper"
      }`}
    >
      {label}
    </Link>
  );
}
