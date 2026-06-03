import type { MetadataRoute } from "next";

import { valueItems } from "@/content/items";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aotrvalue.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/values", "/calculator", "/updates"].map((path) => ({
    changeFrequency: "daily" as const,
    lastModified: now,
    priority: path === "" ? 1 : 0.8,
    url: `${siteUrl}${path}`,
  }));

  const itemRoutes = valueItems.map((item) => ({
    changeFrequency: "weekly" as const,
    lastModified: now,
    priority: 0.6,
    url: `${siteUrl}/items/${item.id}`,
  }));

  return [...staticRoutes, ...itemRoutes];
}
