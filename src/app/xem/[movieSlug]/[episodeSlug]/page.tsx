import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPublicStore } from "@/lib/data";
import { VideoPlayer } from "@/components/player/video-player";
import { EpisodeSidebar } from "@/components/player/episode-sidebar";
import { WatchHistory } from "@/components/player/watch-history";
import { CultivationReactions } from "@/components/player/cultivation-reactions";
import { BookmarkButton } from "@/components/movie/bookmark-button";
import { getMoviesCommunityStats } from "@/app/actions/community";
import { Button } from "@/components/ui/button";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ movieSlug: string; episodeSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { movieSlug, episodeSlug } = await params;
  const store = await getPublicStore();
  const result = await store.getEpisodeBySlug(movieSlug, episodeSlug);

  if (!result) {
    return { title: "Không tìm thấy tập", robots: { index: false, follow: false } };
  }

  const { movie, episode } = result;
  return {
    title: `${movie.title} - ${episode.title}`,
    description: `Xem ${movie.title} ${episode.title} phụ đề tiếng Việt.`,
    alternates: { canonical: `/xem/${movie.slug}/${episode.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function WatchPage({ params }: PageProps) {
  const { movieSlug, episodeSlug } = await params;
  const store = await getPublicStore();

  const result = await store.getEpisodeBySlug(movieSlug, episodeSlug);
  if (!result) notFound();

  const { movie, episode, siblings } = result;
  const statsMap = await getMoviesCommunityStats([movie.id]);
  const communityStat = statsMap[movie.id];

  const publishedSiblings = siblings.filter((e) => e.status === "published");
  const index = publishedSiblings.findIndex((e) => e.id === episode.id);
  const previous = index > 0 ? publishedSiblings[index - 1] : null;
  const next =
    index >= 0 && index < publishedSiblings.length - 1 ? publishedSiblings[index + 1] : null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/phim/${movie.slug}`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-parchment-300/80 transition-colors hover:text-gold-200"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          {movie.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkButton
            variant="pill"
            movieId={movie.id}
            slug={movie.slug}
            title={movie.title}
            originalTitle={movie.originalTitle}
            posterUrl={movie.posterUrl}
            year={movie.year}
            publishedEpisodeCount={movie.publishedEpisodeCount}
          />
          {previous && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/xem/${movie.slug}/${previous.slug}`}>
                <ChevronLeft aria-hidden="true" />
                Tập trước
              </Link>
            </Button>
          )}
          {next && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/xem/${movie.slug}/${next.slug}`}>
                Tập sau
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <h1 className="font-serif text-xl font-semibold text-parchment-100 sm:text-2xl">
        {movie.title}
        <span className="text-gold-200/80"> · {episode.title}</span>
      </h1>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <VideoPlayer
            sources={episode.sources}
            title={`${movie.title} ${episode.title}`}
            storageKey={`gheienphim.source.${movie.slug}.${episode.slug}`}
            movieId={movie.id}
            episodeId={episode.id}
            movieSlug={movie.slug}
            movieTitle={movie.title}
            episodeSlug={episode.slug}
            episodeTitle={episode.title}
          />

          <CultivationReactions
            movieId={movie.id}
            movieSlug={movie.slug}
            initialCounts={communityStat?.reactions}
          />

          <WatchHistory
            movieId={movie.id}
            movieSlug={movie.slug}
            movieTitle={movie.title}
            thumbnailUrl={movie.posterUrl ?? movie.backdropUrl}
            episodeSlug={episode.slug}
            episodeTitle={episode.title}
          />

          {episode.description && (
            <div className="mt-6">
              <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-gold-300/80">
                Nội dung tập
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-parchment-200/90">
                {episode.description}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700/70 pt-4">
            <p className="text-xs text-mist-500">
              {episode.releaseDate
                ? `Ngày phát hành: ${episode.releaseDate}`
                : "Chưa có ngày phát hành"}
            </p>
            <div className="flex gap-2">
              {previous && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/xem/${movie.slug}/${previous.slug}`}>
                    <ChevronLeft aria-hidden="true" />
                    {previous.title || `Tập ${previous.episodeNumber}`}
                  </Link>
                </Button>
              )}
              {next && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/xem/${movie.slug}/${next.slug}`}>
                    {next.title || `Tập ${next.episodeNumber}`}
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <EpisodeSidebar
          movieSlug={movie.slug}
          movieTitle={movie.title}
          episodes={publishedSiblings}
          currentEpisodeId={episode.id}
        />
      </div>
    </div>
  );
}