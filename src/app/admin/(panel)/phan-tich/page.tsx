import { getStore } from "@/lib/data";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import type { LinkCheckResult } from "@/config/mockAnalyticsData";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Phân tích & Sức khỏe Link",
};

export default async function AdminAnalyticsPage() {
  const store = await getStore();
  const movies = await store.listAllMoviesForAdmin();

  const episodesByMovie = await Promise.all(
    movies.map(async (movie) => ({
      movie,
      episodes: await store.listEpisodes(movie.id),
    })),
  );

  const realLinks: LinkCheckResult[] = [];

  for (const { movie, episodes } of episodesByMovie) {
    for (const ep of episodes) {
      for (const source of ep.sources) {
        const urls = source.sourceUrl
          .split(/[\r\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);

        urls.forEach((url, idx) => {
          const isFacebook =
            source.provider === "facebook" ||
            /facebook\.com|fb\.watch/i.test(url);

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

  return <AnalyticsDashboard realLinks={realLinks} />;
}
