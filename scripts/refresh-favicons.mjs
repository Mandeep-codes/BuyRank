/**
 * Re-resolves the favicon for every listing using the same order the scraper
 * now uses (real <link rel="icon"> → /favicon.ico → Google's proxy) and
 * updates the row when it finds something better. Run it once after deploying
 * the favicon fix so existing listings stop showing the generic globe:
 *
 *   node scripts/refresh-favicons.mjs
 *
 * Safe to re-run any time.
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

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false });

async function fetchHead(pageUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BidBoardBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let bytes = 0;
    while (bytes < 512 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    await reader.cancel().catch(() => {});
    return html;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function iconLinks(html, base) {
  const found = [];
  const linkRe = /<link\s+[^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    const tag = m[0];
    const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    if (!rel.includes("icon")) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href || href.startsWith("data:")) continue;
    const sizes = tag.match(/sizes=["'](\d+)x\d+["']/i)?.[1];
    const score =
      (rel.includes("apple") ? 1000 : 0) + (sizes ? parseInt(sizes, 10) : 32);
    try {
      found.push({ href: new URL(href, base).toString(), score });
    } catch {}
  }
  return found.sort((a, b) => b.score - a.score).map((f) => f.href);
}

async function isImage(candidate) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(candidate, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return false;
    const type = res.headers.get("content-type") ?? "";
    await res.body?.cancel().catch(() => {});
    return type.startsWith("image/");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolve(pageUrl) {
  let parsed;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return null;
  }
  const html = await fetchHead(pageUrl);
  const candidates = html ? iconLinks(html, pageUrl).slice(0, 2) : [];
  candidates.push(new URL("/favicon.ico", parsed.origin).toString());
  for (const c of candidates) {
    if (await isImage(c)) return c;
  }
  return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
}

const rows = await sql`select id, url, display_name, favicon_url from entries`;
console.log(`Checking ${rows.length} listing(s)…`);

for (const row of rows) {
  const next = await resolve(row.url);
  if (next && next !== row.favicon_url) {
    await sql`update entries set favicon_url = ${next}, updated_at = now() where id = ${row.id}`;
    console.log(`  ${row.display_name}: updated`);
  } else {
    console.log(`  ${row.display_name}: kept`);
  }
}

await sql.end();
console.log("Done.");
