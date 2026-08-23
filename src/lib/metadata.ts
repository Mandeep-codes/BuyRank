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
        // Some sites serve a blank shell to unknown agents.
        "User-Agent": "Mozilla/5.0 (compatible; BidBoardBot/1.0; +https://example.com/bot)",
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

export async function scrapeMetadata(url: string): Promise<ScrapedMeta> {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  })();

  // Google's favicon service is more reliable than parsing <link rel="icon">
  // across every possible relative-path quirk.
  const faviconUrl = host
    ? `https://www.google.com/s2/favicons?domain=${host}&sz=64`
    : null;

  const html = await fetchHtml(url);
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
