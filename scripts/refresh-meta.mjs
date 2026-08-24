/**
 * Re-scrapes title, description, and favicon for listings that are missing
 * any of them (or stuck on the generic proxy icon), using the same
 * browser-UA fetch the app now uses. Run once after deploying the fix so
 * existing listings heal:
 *
 *   node scripts/refresh-meta.mjs
 *
 * Safe to re-run. Only fills gaps — never overwrites fields that exist.
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

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = postgres(dbUrl, { max: 1, prepare: false });

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function fetchHead(pageUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
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

function findMeta(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const re of [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
        "i",
      ),
    ]) {
      const m = html.match(re);
      if (m?.[1]?.trim()) return m[1];
    }
  }
  return null;
}

function clean(value, max) {
  if (!value) return null;
  const text = value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
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
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(candidate, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "image/*", "User-Agent": UA },
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

const rows =
  await sql`select id, url, display_name, title, description, favicon_url from entries`;

const needy = rows.filter(
  (r) =>
    !r.title ||
    !r.description ||
    !r.favicon_url ||
    r.favicon_url.includes("google.com/s2"),
);
console.log(`${rows.length} listing(s), ${needy.length} missing metadata…`);

for (const row of needy) {
  const html = await fetchHead(row.url);

  let title = row.title;
  let description = row.description;
  if (html) {
    title =
      title ??
      clean(
        findMeta(html, ["og:title", "twitter:title"]) ??
          html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
          null,
        80,
      );
    description =
      description ??
      clean(
        findMeta(html, ["og:description", "twitter:description", "description"]),
        200,
      );
  }

  let favicon = row.favicon_url;
  if (!favicon || favicon.includes("google.com/s2")) {
    let parsed = null;
    try {
      parsed = new URL(row.url);
    } catch {}
    if (parsed) {
      const candidates = html ? iconLinks(html, row.url).slice(0, 2) : [];
      candidates.push(new URL("/favicon.ico", parsed.origin).toString());
      let resolved = null;
      for (const c of candidates) {
        if (await isImage(c)) {
          resolved = c;
          break;
        }
      }
      favicon =
        resolved ??
        `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
    }
  }

  if (
    title !== row.title ||
    description !== row.description ||
    favicon !== row.favicon_url
  ) {
    await sql`update entries set
        title = ${title},
        description = ${description},
        favicon_url = ${favicon},
        updated_at = now()
      where id = ${row.id}`;
    console.log(`  ${row.display_name}: updated`);
  } else {
    console.log(`  ${row.display_name}: nothing new found`);
  }
}

await sql.end();
console.log("Done.");
