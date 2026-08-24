/** $14,018 — bids are always whole dollars, so no cents are ever shown. */
export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** "just now", "4 minutes ago", "yesterday" — matches how the board reads. */
export function timeAgo(date: Date | string): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);

  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * "2h", "3d 4h" — null under `minHours`, so callers can hide trivially short
 * durations instead of printing "on top 0h".
 */
export function formatDuration(ms: number, minHours = 0): string | null {
  const hours = Math.floor(ms / 3_600_000);
  if (hours < minHours) return null;
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
