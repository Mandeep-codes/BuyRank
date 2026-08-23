import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /r/ is the click tracker — crawlers following it would inflate counts
      // and hand every listing a redirect-shaped backlink.
      disallow: ["/api/", "/r/", "/success"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
