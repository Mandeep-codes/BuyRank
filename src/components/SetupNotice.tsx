import Link from "next/link";

/**
 * Database problems we can name. Anything else is rethrown — hiding a real bug
 * behind a friendly screen is worse than a stack trace.
 */
const KNOWN = {
  "42P01": {
    title: "The database tables don't exist yet",
    detail:
      "The connection works, but the schema was never created — db:push didn't finish.",
    fix: "npm run db:push",
  },
  "28P01": {
    title: "The database rejected your password",
    detail:
      "The host is reachable but the credentials are wrong. If you rotated the password, update DATABASE_URL.",
    fix: "npm run db:check",
  },
  "28000": {
    title: "The database rejected your login",
    detail:
      "On Supabase the pooler username includes the project ref — postgres.yourprojectref, not just postgres.",
    fix: "npm run db:check",
  },
  "3D000": {
    title: "That database doesn't exist",
    detail: "The server answered, but there's no database with that name.",
    fix: "npm run db:check",
  },
  ENOTFOUND: {
    title: "The database host can't be found",
    detail:
      "Check the hostname in DATABASE_URL. On Supabase use a pooler string — the direct db.xxx.supabase.co host is IPv6-only and most networks can't reach it.",
    fix: "npm run db:check",
  },
  ENETUNREACH: {
    title: "The database host is unreachable",
    detail:
      "This is what an IPv6-only Supabase direct connection looks like from an IPv4 network. Use the pooler string instead.",
    fix: "npm run db:check",
  },
  ECONNREFUSED: {
    title: "The database refused the connection",
    detail: "Nothing is listening on that host and port.",
    fix: "npm run db:check",
  },
  CONNECT_TIMEOUT: {
    title: "The database didn't answer in time",
    detail:
      "Usually a wrong port or a firewall. Supabase uses 6543 for the transaction pooler and 5432 for the session pooler.",
    fix: "npm run db:check",
  },
} as const;

export function databaseErrorCode(error: unknown): string | null {
  let current: unknown = error;
  // Drizzle wraps the driver error, so walk the cause chain.
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && code in KNOWN) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

export function SetupNotice({ code }: { code: string }) {
  const issue = KNOWN[code as keyof typeof KNOWN];
  if (!issue) return null;

  return (
    <main className="mx-auto max-w-xl px-5 py-24">
      <p className="text-[11px] uppercase tracking-[0.24em] text-pop">
        Setup incomplete
      </p>
      <h1 className="mt-4 text-4xl font-extrabold font-bold leading-tight tracking-tight text-ink">
        {issue.title}
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-mute">{issue.detail}</p>

      <p className="mt-8 text-[11px] uppercase tracking-[0.16em] text-mute">
        Run this
      </p>
      <pre className="mt-2 overflow-x-auto rounded border border-ink/20 bg-paper px-4 py-3.5 text-sm">
        <code className="tnum text-pop">{issue.fix}</code>
      </pre>

      <p className="mt-10 border-t border-ink/20 pt-6 text-sm text-mute">
        This screen only appears in development, and only for database problems
        that can be named.{" "}
        <Link href="/rules" className="text-pop underline underline-offset-4">
          Rules
        </Link>
      </p>
    </main>
  );
}
