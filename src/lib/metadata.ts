/**
 * Pulls the title, description and favicon off a submitted page so the person
 * bidding doesn't have to type any of it. Deliberately dependency-free: we only
 * need four fields and a full HTML parser isn't worth the install.
 */

export type ScrapedMeta = {
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
};

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 512 * 1024; // meta tags live in the head; 512kb is plenty

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    // The `x` group is what decides the radix — inferring it from the digits
    // would read &#x27; as decimal 27 and produce the wrong character.
    .replace(/&#(x?)([0-9a-f]+);/gi, (match, hex: string, code: string) => {
      const point = parseInt(code, hex ? 16 : 10);
      if (!Number.isFinite(point) || point < 1 || point > 0x10ffff) return match;
      try {
        return String.fromCodePoint(point);
      } catch {
        return match;
      }
    })
    .trim();
}

function clean(value: string | null, max: number): string | null {
  if (!value) return null;
  const text = decodeEntities(value).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Finds <meta property="og:title" content="..."> in either attribute order. */
function findMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
        "i",
      ),
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]?.trim()) return match[1];
    }
  }
  return null;
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // A plain browser UA, deliberately: Cloudflare and friends 403 any
        // UA with "bot" in it, which is why new listings were arriving with
        // no title, description, or icon. This is one fetch per submission
        // of a page the submitter explicitly asked us to read.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok || !res.body) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return null;

    // Read only the first chunk — we want <head>, not the whole page.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let bytes = 0;

    while (bytes < MAX_BYTES) {
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

/** Pulls every <link rel="...icon..."> href out of the head, best first. */
function findIconLinks(html: string, base: string): string[] {
  const found: { href: string; score: number }[] = [];
  const linkRe = /<link\s+[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(html))) {
    const tag = match[0];
    const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    if (!rel.includes("icon")) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href || href.startsWith("data:")) continue;

    // apple-touch-icon is usually 180px; sized icons beat unsized ones.
    const sizes = tag.match(/sizes=["'](\d+)x\d+["']/i)?.[1];
    const score =
      (rel.includes("apple") ? 1000 : 0) + (sizes ? parseInt(sizes, 10) : 32);

    try {
      found.push({ href: new URL(href, base).toString(), score });
    } catch {
      // Unresolvable href — skip it.
    }
  }

  return found.sort((a, b) => b.score - a.score).map((f) => f.href);
}

/** True if the URL answers with an actual image. One quick, bounded request. */
async function isImage(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "image/*",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
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

/**
 * The site's own icon first, verified; /favicon.ico second; Google's proxy
 * only as the floor. New indie domains are the whole audience here, and the
 * proxy returns a generic globe for domains it hasn't crawled — which is why
 * icons were coming out "wrong" when it was the first choice.
 */
async function resolveFavicon(
  url: string,
  html: string | null,
): Promise<string | null> {
  const parsed = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();
  if (!parsed) return null;

  const candidates = html ? findIconLinks(html, url).slice(0, 2) : [];
  candidates.push(new URL("/favicon.ico", parsed.origin).toString());

  for (const candidate of candidates) {
    if (await isImage(candidate)) return candidate;
  }

  return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
}

export async function scrapeMetadata(url: string): Promise<ScrapedMeta> {
  const html = await fetchHtml(url);
  const faviconUrl = await resolveFavicon(url, html);

  if (!html) return { title: null, description: null, faviconUrl };

  const title =
    findMeta(html, ["og:title", "twitter:title"]) ??
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
    null;

  const description = findMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);

  return {
    title: clean(title, 80),
    description: clean(description, 200),
    faviconUrl,
  };
}
