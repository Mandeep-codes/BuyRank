/**
 * Everything that decides whether a submitted link is allowed on the board,
 * and what canonical form it gets stored as.
 */

/** Query params stripped from every URL so the same page can't be listed twice. */
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "ref",
  "referrer",
  "source",
  "via",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "twclid",
  "ttclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "aff",
  "affiliate",
  "affiliate_id",
  "partner",
  "tap_a",
  "tap_s",
  "fpr",
  "_ga",
];

/**
 * Chat, invite and file-drop hosts. These get submitted constantly and are
 * never a product, so they're refused outright.
 */
const BLOCKED_HOSTS = [
  "t.me",
  "telegram.me",
  "telegram.dog",
  "wa.me",
  "chat.whatsapp.com",
  "api.whatsapp.com",
  "discord.gg",
  "discord.com",
  "discordapp.com",
  "m.me",
  "messenger.com",
  "signal.group",
  "signal.me",
  "join.skype.com",
  "line.me",
  "kakao.com",
  "wechat.com",
  "bit.ly",
  "tinyurl.com",
  "goo.gl",
  "t.co",
  "is.gd",
  "cutt.ly",
  "shorturl.at",
  "rebrand.ly",
  "rb.gy",
  "drive.google.com",
  "docs.google.com",
  "dropbox.com",
  "mega.nz",
  "anonfiles.com",
  "localhost",
];

/** Hosts we never allow even as a subdomain match. */
const BLOCKED_SUFFIXES = [".onion", ".local", ".internal", ".test"];

export type UrlCheck =
  | { ok: true; url: string; displayName: string; kind: "site" | "handle" }
  | { ok: false; reason: string };

/**
 * Turns whatever the person typed into a canonical URL, or explains why it
 * can't go on the board. Accepts bare domains ("acme.com") and X handles
 * ("@acme"), both of which people type constantly.
 */
export function normalizeSubmission(raw: string): UrlCheck {
  const input = raw.trim();

  if (!input) return { ok: false, reason: "Enter a URL or an @handle." };
  if (input.length > 400) return { ok: false, reason: "That URL is too long." };

  // "@handle" is shorthand for an X profile.
  if (/^@[A-Za-z0-9_]{1,15}$/.test(input)) {
    const handle = input.slice(1);
    return {
      ok: true,
      url: `https://x.com/${handle.toLowerCase()}`,
      displayName: `@${handle} on X`,
      kind: "handle",
    };
  }

  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid URL." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "Only http and https links are allowed." };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (!host.includes(".")) {
    return { ok: false, reason: "That doesn't look like a real domain." };
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return { ok: false, reason: "IP addresses can't be listed." };
  }
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: "That domain can't be listed." };
  }
  if (BLOCKED_HOSTS.includes(host)) {
    return {
      ok: false,
      reason:
        "Chat invites, shorteners and file links aren't allowed. Link the product itself.",
    };
  }

  // Strip tracking noise so two people can't list the same page twice.
  for (const p of TRACKING_PARAMS) parsed.searchParams.delete(p);
  parsed.searchParams.sort();

  parsed.protocol = "https:";
  parsed.hostname = host;
  parsed.hash = "";
  parsed.port = "";
  if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  const query = parsed.searchParams.toString();
  const path = parsed.pathname === "/" ? "" : parsed.pathname;
  const url = `https://${host}${path}${query ? `?${query}` : ""}`;

  // An X profile link should read like a handle, not like a URL.
  if ((host === "x.com" || host === "twitter.com") && path) {
    const seg = path.split("/").filter(Boolean);
    if (seg.length === 1 && /^[A-Za-z0-9_]{1,15}$/.test(seg[0])) {
      return {
        ok: true,
        url: `https://x.com/${seg[0].toLowerCase()}`,
        displayName: `@${seg[0]} on X`,
        kind: "handle",
      };
    }
  }

  return { ok: true, url, displayName: host, kind: "site" };
}

/** Adds our attribution param to an outbound link. */
export function withUtm(url: string, source: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", source);
    return u.toString();
  } catch {
    return url;
  }
}
