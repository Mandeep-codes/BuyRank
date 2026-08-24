import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

/** Shared shell so the three policy pages stay visually identical. */
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
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/" className="text-2xl font-extrabold">
        {SITE_NAME}
      </Link>

      <h1 className="mt-10 text-4xl font-extrabold tracking-tight">
        {title}
      </h1>
      <p className="mt-2 text-sm font-semibold text-mute">
        Last updated {updated}
      </p>

      <div className="mt-10 space-y-8">{children}</div>
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
      <h2 className="text-xl font-extrabold tracking-tight">
        {heading}
      </h2>
      <div className="mt-2.5 space-y-2.5 text-[15px] leading-relaxed text-mute">
        {children}
      </div>
    </section>
  );
}
