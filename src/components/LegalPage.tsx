import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

/** Shared shell so the policy pages stay visually identical. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-[11px] font-semibold tracking-[0.01em] text-dim transition hover:text-ink"
      >
        &larr; {SITE_NAME}
      </Link>

      <h1 className="mt-10 text-[40px] font-bold leading-none tracking-[-0.02em]">
        {title}
      </h1>
      <p className="mt-4 text-[10px] font-semibold tracking-[0.01em] text-dim">
        Last updated {updated}
      </p>

      <div className="mt-10 space-y-8 pt-8">{children}</div>
    </main>
  );
}

export function Clause({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[20px] font-bold tracking-[-0.02em]">{heading}</h2>
      <div className="mt-2.5 space-y-2.5 text-[14px] leading-relaxed text-dim">
        {children}
      </div>
    </section>
  );
}
