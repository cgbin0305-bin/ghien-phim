import { getStore } from "@/lib/data";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import type { LinkCheckResult } from "@/config/mockAnalyticsData";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Phân tích & Sức khỏe Link",
};

/**
 * Nạp toàn bộ link tập phim để quét sức khỏe link:
 * - Khi dùng Supabase: gom thành 2 truy vấn phẳng song song (`movies` + `episodes` lồng `video_sources`)
 *   thay vì N+1 (`2N + 1` truy vấn theo từng phim), giúp mở rộng mượt mà kể cả khi có hàng trăm phim.
 * - Khi ở chế độ demo: đọc từ demo store trong RAM.
 */
async function loadRealLinksForHealthCheck(): Promise<LinkCheckResult[]> {
  const realLinks: LinkCheckResult[] = [];

  if (hasSupabaseConfig) {
    const client = await createClient();
    const [moviesRes, episodesRes] = await Promise.all([
      client.from("movies").select("id, slug, title").order("sort_order", { ascending: true }),
      client
        .from("episodes")
        .select(
          "id, movie_id, episode_number, title, video_sources(id, provider, source_url, label, priority)",
        )
        .order("episode_number", { ascending: true }),
    ]);

    if (!moviesRes.error && !episodesRes.error) {
      const movieMap = new Map(
        ((moviesRes.data ?? []) as Array<{ id: string; slug: string; title: string }>).map((m) => [
          m.id,
          m,
        ]),
      );

      type EpisodeRowWithSources = {
        id: string;
        movie_id: string;
        episode_number: number;
        title: string;
        video_sources: Array<{
          id: string;
          provider: string;
          source_url: string;
          label: string | null;
          priority: number;
        }> | null;
      };

      for (const ep of (episodesRes.data ?? []) as unknown as EpisodeRowWithSources[]) {
        const movie = movieMap.get(ep.movie_id);
        if (!movie) continue;

        const sources = [...(ep.video_sources ?? [])].sort((a, b) => a.priority - b.priority);
        for (const source of sources) {
          const urls = source.source_url
            .split(/[\r\n,]+/)
            .map((u) => u.trim())
            .filter(Boolean);

          urls.forEach((url, idx) => {
            const isFacebook =
              source.provider === "facebook" || /facebook\.com|fb\.watch/i.test(url);

            realLinks.push({
              id: `${ep.id}-${source.id}-${idx}`,
              movieId: movie.id,
              movieSlug: movie.slug,
              movieTitle: movie.title,
              episodeId: ep.id,
              episodeNumber: ep.episode_number,
              episodeTitle: ep.title,
              serverLabel:
                urls.length > 1
                  ? `${source.label || "Server"} #${idx + 1}`
                  : source.label || (isFacebook ? "Server FB" : "Server YT"),
              provider: isFacebook ? "facebook" : "youtube",
              sourceUrl: url,
              status: "idle",
              httpCode: null,
              statusMessage: "Chưa kiểm tra",
              checkedAt: null,
            });
          });
        }
      }

      return realLinks;
    }
  }

  const store = await getStore();
  const movies = await store.listAllMoviesForAdmin();
  const episodesByMovie = await Promise.all(
    movies.map(async (movie) => ({
      movie,
      episodes: await store.listEpisodes(movie.id),
    })),
  );

  for (const { movie, episodes } of episodesByMovie) {
    for (const ep of episodes) {
      for (const source of ep.sources) {
        const urls = source.sourceUrl
          .split(/[\r\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);

        urls.forEach((url, idx) => {
          const isFacebook =
            source.provider === "facebook" || /facebook\.com|fb\.watch/i.test(url);

          realLinks.push({
            id: `${ep.id}-${source.id}-${idx}`,
            movieId: movie.id,
            movieSlug: movie.slug,
            movieTitle: movie.title,
            episodeId: ep.id,
            episodeNumber: ep.episodeNumber,
            episodeTitle: ep.title,
            serverLabel:
              urls.length > 1
                ? `${source.label || "Server"} #${idx + 1}`
                : source.label || (isFacebook ? "Server FB" : "Server YT"),
            provider: isFacebook ? "facebook" : "youtube",
            sourceUrl: url,
            status: "idle",
            httpCode: null,
            statusMessage: "Chưa kiểm tra",
            checkedAt: null,
          });
        });
      }
    }
  }

  return realLinks;
}

export default async function AdminAnalyticsPage() {
  const realLinks = await loadRealLinksForHealthCheck();
  return <AnalyticsDashboard realLinks={realLinks} />;
}
