/**
 * Fills the board with plausible-looking listings so you can see the layout,
 * the ladder bars and pagination before a single real bid comes in.
 *
 *   node scripts/seed.mjs
 *
 * Safe to re-run: it clears both tables first. Never point it at production.
 */
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// Read .env.local so you never have to paste the database URL into a shell
// command (where it lands in your terminal history).
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

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const CATEGORIES = [
  "ai-agents",
  "seo-visibility",
  "developer-tools",
  "marketing-advertising",
  "design-creative",
  "productivity",
  "social-creator",
  "business-finance",
  "health-fitness",
  "crypto-investing",
  "other",
];

const WORDS = [
  "flux", "orbit", "north", "quill", "atlas", "ember", "drift", "lumen",
  "verve", "cobalt", "stack", "signal", "canvas", "relay", "pivot", "onyx",
  "arbor", "prism", "vault", "harbor", "cinder", "nomad", "beacon", "forge",
];
const TLDS = [".com", ".io", ".ai", ".dev", ".app", ".co"];

const BLURBS = [
  "Turn a rough idea into a working landing page in under a minute. No setup, no template picking.",
  "Track every signup back to the campaign that produced it, without another analytics script.",
  "A calmer inbox. Bulk-archive by sender, snooze by rule, and never see a newsletter twice.",
  "Ship changelog entries straight from your merged pull requests. Nobody writes release notes anymore.",
  "Bookkeeping that reconciles itself. Connect the bank, approve the exceptions, close the month.",
  "Rent real devices in twelve regions and see exactly what your users see before you deploy.",
  "Compare vendor pricing across four hundred SaaS tools with the discounts actually applied.",
  "Voice notes to structured meeting minutes, with the decisions pulled out and assigned.",
  null,
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Real boards are steeply top-heavy: a few thousand-dollar spots and a long
 * tail of single digits. A power-law draw gets much closer to that than
 * a uniform random would.
 */
function bidCents(index, total) {
  const position = index / total;
  const dollars = Math.max(1, Math.round(14000 * Math.pow(1 - position, 9)));
  return dollars * 100;
}

const COUNT = 120;

const rows = [];
const seen = new Set();

while (rows.length < COUNT) {
  const host = `${pick(WORDS)}${pick(WORDS)}${pick(TLDS)}`;
  if (seen.has(host)) continue;
  seen.add(host);

  const i = rows.length;
  const amount = bidCents(i, COUNT);
  const ageMinutes = Math.round(Math.pow(Math.random(), 2) * 60 * 40);

  rows.push({
    id: randomUUID(),
    url: `https://${host}`,
    display_name: host,
    title: host.split(".")[0],
    description: pick(BLURBS),
    favicon_url: `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
    category: pick(CATEGORIES),
    bid_cents: amount,
    clicks: Math.round(Math.pow(Math.random(), 2) * amount * 0.4),
    created_at: new Date(Date.now() - ageMinutes * 60_000),
  });
}

await sql`truncate table bids, entries restart identity cascade`;

for (const row of rows) {
  await sql`
    insert into entries ${sql(row, "id", "url", "display_name", "title",
      "description", "favicon_url", "category", "bid_cents", "clicks", "created_at")}
  `;
  await sql`
    insert into bids (entry_id, amount_cents, payment_id, created_at)
    values (${row.id}, ${row.bid_cents}, ${"seed_" + randomUUID()}, ${row.created_at})
  `;
}

const [{ count }] = await sql`select count(*)::int from entries`;
const [{ total }] = await sql`select coalesce(sum(amount_cents),0)::int as total from bids`;

console.log(`Seeded ${count} listings, $${(total / 100).toLocaleString()} in bids.`);
await sql.end();
