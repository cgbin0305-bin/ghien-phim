import type { MetadataRoute } from "next";
import { getPublicStore } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * The sitemap contains only published, canonical public pages.
 * Draft content and the entire /admin area are excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isDemoMode) {
    return [];
  }

  const store = await getPublicStore();

  const [movies, posts] = await Promise.all([
    store.listMovies({ perPage: 500 }),
    store.listPosts(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/phim`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/lich-chieu`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/bai-viet`, changeFrequency: "weekly", priority: 0.7 },
  ];

  for (const movie of movies.movies) {
    entries.push({
      url: `${BASE_URL}/phim/${movie.slug}`,
      lastModified: new Date(movie.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const post of posts) {
    entries.push({
      url: `${BASE_URL}/bai-viet/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}