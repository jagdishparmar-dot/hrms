import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPaths = ["/login", "/signup"];

  return publicPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  }));
}
