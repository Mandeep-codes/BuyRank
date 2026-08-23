import { readFileSync } from "node:fs";
import type { Config } from "drizzle-kit";

/**
 * drizzle-kit only auto-loads `.env`, but Next.js uses `.env.local` — so
 * without this, `npm run db:push` fails with "DATABASE_URL is not set" even
 * though `npm run dev` connects fine. Load it here rather than making you keep
 * the same secret in two files.
 */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    let contents: string;
    try {
      contents = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    for (const line of contents.split("\n")) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue; // a real env var always wins
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvFiles();

/**
 * Migrations want a session-mode connection. Supabase's transaction pooler
 * (port 6543) shares one backend connection across clients and drops session
 * state between statements, which is fine for queries but unreliable for DDL.
 *
 * So: DIRECT_DATABASE_URL for schema changes if you've set one, DATABASE_URL
 * otherwise. On Neon or a plain Postgres you only need DATABASE_URL.
 */
const migrationUrl =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

if (migrationUrl.includes(":6543")) {
  console.warn(
    "\n  Warning: this is a transaction-pooler URL (port 6543). If the push\n" +
      "  fails or hangs, set DIRECT_DATABASE_URL to your session-pooler\n" +
      "  string (port 5432) and run it again.\n",
  );
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: migrationUrl },
} satisfies Config;
