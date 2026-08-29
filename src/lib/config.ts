export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "bidboard";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const SITE_TAGLINE = "The board is bought, not earned.";
/** Monitored support address. Payment review checks that this is reachable. */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com";
/** Shown on the legal pages. Update when you change the policies. */
export const POLICY_UPDATED = "23 August 2026";
export const SITE_DESCRIPTION =
  "A public leaderboard where rank is decided by money. Bid $1 to get on. Pay more than the row above you to climb.";

/** Cheapest bid that gets you on the board, in cents. */
export const MIN_BID_CENTS = 100;
/** Nobody can bid more than this in one go. Sanity guard against fat fingers. */
export const MAX_BID_CENTS = 5_000_000;
/** Rows shown per page. */
export const PAGE_SIZE = 50;

/**
 * Sponsored placements, priced by position. Each tier is its own card with
 * its own queue; higher tiers sit higher on the page. Prices are server-
 * derived at checkout — never trusted from the browser.
 */
export type SponsorTier = {
  id: "premium" | "plus" | "standard";
  label: string;
  priceCentsPerDay: number;
};

export const SPONSOR_TIERS: SponsorTier[] = [
  { id: "premium", label: "Premium", priceCentsPerDay: 2_500 },
  { id: "plus", label: "Plus", priceCentsPerDay: 1_500 },
  { id: "standard", label: "Standard", priceCentsPerDay: 500 },
];

export function sponsorTier(id: string): SponsorTier | null {
  return SPONSOR_TIERS.find((t) => t.id === id) ?? null;
}

/** Longest single rental. Keeps the queue short and the spot contestable. */
export const SPONSOR_MAX_DAYS = 7;

/**
 * Display thresholds: a stat that argues against the site is worse than no
 * stat. These hide real-but-weak numbers until they read as strength — the
 * numbers themselves are never altered.
 */
export const MIN_ONLINE_TO_SHOW = 5;
export const MIN_PAID_STAT_CENTS = 10_000;
export const MIN_CLICKS_STAT = 10;
export const MIN_VIEWS_STAT = 25;
/** Visitors since launch is only shown once it reads as a crowd. */
export const MIN_VISITORS_TO_SHOW = 50;
/** Appended to every outbound link so bidders can attribute their traffic. */
export const UTM_SOURCE = SITE_NAME.toLowerCase().replace(/\s+/g, "");

export const CATEGORIES = [
  { slug: "ai-agents", label: "AI Agents & Infrastructure" },
  { slug: "seo-visibility", label: "SEO & AI Visibility" },
  { slug: "developer-tools", label: "Developer Tools" },
  { slug: "marketing-advertising", label: "Marketing & Advertising" },
  { slug: "design-creative", label: "Design & Creative" },
  { slug: "productivity", label: "Productivity & Personal Tools" },
  { slug: "social-creator", label: "Social Media & Creator Tools" },
  { slug: "writing-content", label: "Writing & Content" },
  { slug: "sales-leadgen", label: "Sales & Lead Generation" },
  { slug: "business-finance", label: "Business, Finance & Legal" },
  { slug: "ecommerce-retail", label: "Ecommerce & Retail" },
  { slug: "health-fitness", label: "Health, Fitness & Wellness" },
  { slug: "education", label: "Education & Learning" },
  { slug: "games-entertainment", label: "Games & Entertainment" },
  { slug: "crypto-investing", label: "Crypto, Web3 & Investing" },
  { slug: "hiring-careers", label: "Hiring, Jobs & Careers" },
  { slug: "agencies-services", label: "Agencies, Studios & Services" },
  { slug: "security-privacy", label: "Security, Privacy & Compliance" },
  { slug: "media-generation", label: "AI Media Generation" },
  { slug: "audio-podcasting", label: "Audio, Voice & Podcasting" },
  { slug: "domains-assets", label: "Domains & Web Assets" },
  { slug: "people-profiles", label: "People & Profiles" },
  { slug: "other", label: "Other" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as string[];

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? "Other";
}
