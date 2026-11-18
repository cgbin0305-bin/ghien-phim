import type { MetadataRoute } from "next";
import { isDemoMode } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
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
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/sitemap.xml`,
  };
}