import type { MetadataRoute } from "next";
import { CATEGORIES, SITE_URL } from "@/lib/config";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, priority: 0.4 },
    { url: `${SITE_URL}/rules`, lastModified: now, priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, priority: 0.2 },
    { url: `${SITE_URL}/refunds`, lastModified: now, priority: 0.2 },
    ...CATEGORIES.map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
