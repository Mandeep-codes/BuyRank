/**
 * Everything that has to be true before this site takes real money.
 *
 *   npm run preflight
 *
 * Exits non-zero if anything is a hard blocker.
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

const problems = [];
const warnings = [];
const ok = [];

function check(condition, label, fix, hard = true) {
  if (condition) ok.push(label);
  else (hard ? problems : warnings).push({ label, fix });
}

// ---- Environment --------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SITE_URL || "";
check(
  url && !url.includes("localhost"),
  "Site URL points at the real domain",
  "Set NEXT_PUBLIC_SITE_URL to your live https:// domain. Payment return URLs and link previews are built from it.",
);
check(
  url.startsWith("https://") || !url,
  "Site URL uses https",
  "NEXT_PUBLIC_SITE_URL must start with https:// in production.",
);
check(
  (process.env.NEXT_PUBLIC_SITE_NAME || "") !== "bidboard",
  "Site name changed from the placeholder",
  "Set NEXT_PUBLIC_SITE_NAME to your real name.",
  false,
);
check(
  process.env.NEXT_PUBLIC_CONTACT_EMAIL &&
    !process.env.NEXT_PUBLIC_CONTACT_EMAIL.includes("example.com"),
  "Contact email set",
  "Set NEXT_PUBLIC_CONTACT_EMAIL. Payment review checks that a real support address is reachable from your site.",
);
check(
  process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN !== "change-me",
  "Admin token changed",
  "Set ADMIN_TOKEN to a long random string, or you cannot remove scam listings.",
);

// ---- Payments -----------------------------------------------------------
const hasKeys =
  process.env.DODO_PAYMENTS_API_KEY?.trim() &&
  process.env.DODO_PRODUCT_ID?.trim();
check(
  hasKeys,
  "Payment keys present",
  "Add DODO_PAYMENTS_API_KEY and DODO_PRODUCT_ID. Without them the bid button shows 'Opening soon' — fine before launch, not after.",
  false,
);
check(
  process.env.DODO_WEBHOOK_SECRET?.trim(),
  "Webhook secret present",
  "Add DODO_WEBHOOK_SECRET. Without it no payment ever reaches the board.",
  false,
);
if (hasKeys) {
  check(
    process.env.DODO_ENVIRONMENT === "live_mode",
    "Payments in live mode",
    "DODO_ENVIRONMENT is still test_mode. Real cards will not work.",
    false,
  );
  check(
    !process.env.DODO_PAYMENTS_API_KEY.startsWith("test"),
    "Live API key in use",
    "That looks like a test key. Swap it for the live one.",
    false,
  );
}

// ---- Database -----------------------------------------------------------
if (!process.env.DATABASE_URL) {
  problems.push({
    label: "DATABASE_URL set",
    fix: "Add DATABASE_URL to .env.local.",
  });
} else {
  const sql = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
  });
  try {
    const tables = await sql`
      select table_name from information_schema.tables
      where table_schema='public' and table_name in ('entries','bids')
    `;
    check(tables.length === 2, "Database tables exist", "Run: npm run db:push");

    if (tables.length === 2) {
      const [{ n: seeded }] = await sql`
        select count(*)::int as n from bids where payment_id like 'seed_%'
      `;
      check(
        seeded === 0,
        "No seed data on the board",
        `${seeded} fake listings are still live. Run: truncate table bids, entries restart identity cascade;`,
      );

      const [{ n: live }] = await sql`
        select count(*)::int as n from entries where status='active' and bid_cents > 0
      `;
      if (seeded === 0 && live === 0) {
        warnings.push({
          label: "Board has real listings",
          fix: "The board is empty. An empty leaderboard converts at roughly zero — line up a few real bids before you send traffic.",
        });
      }
    }
  } catch (error) {
    problems.push({
      label: "Database reachable",
      fix: `Connection failed: ${error.message.split("\n")[0]}. Run: npm run db:check`,
    });
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

// ---- Report -------------------------------------------------------------
console.log("");
for (const label of ok) console.log(`  PASS  ${label}`);
for (const w of warnings) console.log(`  WARN  ${w.label}\n        ${w.fix}`);
for (const p of problems) console.log(`  FAIL  ${p.label}\n        ${p.fix}`);

console.log(
  `\n  ${ok.length} passed, ${warnings.length} warnings, ${problems.length} blockers\n`,
);

if (problems.length) {
  console.log("  Fix the blockers above before taking real payments.\n");
  process.exit(1);
}
console.log("  Ready to go live.\n");
