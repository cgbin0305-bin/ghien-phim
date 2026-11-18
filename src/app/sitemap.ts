import type { MetadataRoute } from "next";
import { getPublicStore } from "@/lib/data";
import { isDemoMode, getSiteUrl } from "@/lib/env";

/**
 * The sitemap contains only published, canonical public pages.
 * Draft content and the entire /admin area are excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/phim`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/lich-chieu`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/bai-viet`, changeFrequency: "weekly", priority: 0.7 },
  ];

  if (isDemoMode) {
    return entries;
  }

  try {
    const store = await getPublicStore();
    const [movies, posts] = await Promise.all([
      store.listMovies({ perPage: 500 }),
      store.listPosts(),
    ]);

    for (const movie of movies.movies) {
      entries.push({
        url: `${baseUrl}/phim/${movie.slug}`,
        lastModified: new Date(movie.updatedAt),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const post of posts) {
      entries.push({
        url: `${baseUrl}/bai-viet/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.warn("[sitemap] Không thể tải danh sách phim/bài viết cho sitemap:", err);
  }

  return entries;
}