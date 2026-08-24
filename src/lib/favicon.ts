/**
 * Google's favicon proxy, used as the *last* fallback rather than the first
 * choice: for brand-new domains it returns a generic globe, which is exactly
 * the audience this board serves. sz=128 returns the largest cached variant.
 */
export function faviconProxy(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
