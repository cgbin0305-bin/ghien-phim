import type { MetadataRoute } from "next";
import { isDemoMode, getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  if (isDemoMode) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin area must never be indexed.
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}