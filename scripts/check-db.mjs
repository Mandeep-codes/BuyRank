/**
 * Tells you exactly what your DATABASE_URL is connected to, so a failing setup
 * takes one command to diagnose instead of guesswork.
 *
 *   node scripts/check-db.mjs
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(raw);
} catch {
  console.error("DATABASE_URL is not a valid URL.");
  process.exit(1);
}

const host = parsed.hostname;
const port = parsed.port || "5432";

/** Works out which of Supabase's three connection strings this is. */
function describe() {
  if (host.includes("pooler.supabase.com")) {
    return port === "6543"
      ? { mode: "Supabase transaction pooler", good: "app", ddl: false }
      : { mode: "Supabase session pooler", good: "app + migrations", ddl: true };
  }
  if (host.includes("supabase.co")) {
    return {
      mode: "Supabase direct connection (IPv6 only)",
      good: "local dev",
      ddl: true,
      warn: "Vercel can't reach IPv6 hosts — use a pooler string in production.",
    };
  }
  if (host.includes("neon.tech")) {
    return {
      mode: host.includes("-pooler") ? "Neon pooled" : "Neon direct",
      good: "app + migrations",
      ddl: true,
    };
  }
  return { mode: "Postgres", good: "app + migrations", ddl: true };
}

const info = describe();

console.log(`\n  Host      ${host}`);
console.log(`  Port      ${port}`);
console.log(`  User      ${parsed.username || "(none)"}`);
console.log(`  Type      ${info.mode}`);
console.log(`  Suited to ${info.good}`);

if (parsed.searchParams.has("channel_binding")) {
  console.log(
    `\n  Remove &channel_binding=require — the driver forwards it to the\n` +
      `  server and the connection fails.`,
  );
}
if (info.warn) console.log(`\n  ${info.warn}`);
if (!info.ddl) {
  console.log(
    `\n  For migrations, set DIRECT_DATABASE_URL to your session-pooler\n` +
      `  string (port 5432) before running db:push.`,
  );
}

const sql = postgres(raw, { prepare: false, max: 1, idle_timeout: 5 });

try {
  const [{ version }] = await sql`select version()`;
  console.log(`\n  Connected: ${version.split(",")[0]}`);

  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name in ('entries','bids')
    order by table_name
  `;
  const names = tables.map((t) => t.table_name);

  if (names.length === 2) {
    const [{ n: entryCount }] = await sql`select count(*)::int as n from entries`;
    const [{ n: bidCount }] = await sql`select count(*)::int as n from bids`;
    console.log(`  Schema:    ready (${entryCount} listings, ${bidCount} bids)`);
    if (entryCount === 0) {
      console.log(`\n  Board is empty. Run: node scripts/seed.mjs`);
    }
  } else {
    console.log(`  Schema:    missing ${names.length ? "bids or entries" : "both tables"}`);
    console.log(`\n  Run: npm run db:push`);
  }
  console.log("");
} catch (error) {
  console.log(`\n  Connection failed: ${error.message.split("\n")[0]}\n`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
