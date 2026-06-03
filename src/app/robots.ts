import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aotrvalue.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        allow: ["/", "/values", "/calculator", "/items/"],
        disallow: ["/admin", "/api/"],
        userAgent: "*",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
