import { Play } from "lucide-react";
import type { MovieWithStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { SafeImage } from "@/components/ui/safe-image";
import { BookmarkButton } from "@/components/movie/bookmark-button";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  movie: MovieWithStats;
  /** Show the episode progress bar. */
  showProgress?: boolean;
  priority?: boolean;
  className?: string;
}

const RELEASE_LABELS: Record<MovieWithStats["releaseStatus"], string> = {
  upcoming: "Sắp chiếu",
  airing: "Đang chiếu",
  completed: "Hoàn thành",
};

const SUBTITLE_LABELS: Record<NonNullable<MovieWithStats["subtitleLabel"]>, string> = {
  vietsub: "Vietsub",
  thuyet_minh: "Thuyết minh",
  raw: "Vietsub",
};

export function MovieCard({ movie, showProgress = true, priority = false, className }: MovieCardProps) {
  const published = movie.publishedEpisodeCount;
  // Tổng số tập được suy ra từ chính danh sách tập, không khai báo thủ công.
  const total = movie.episodeCount;
  const progress = total > 0 ? Math.min(100, Math.round((published / total) * 100)) : 0;

  return (
    <article
      className={cn(
        "card-cinematic group relative flex flex-col rounded-xl border border-ink-700/80 bg-ink-900/65 p-2.5 shadow-card hover:bg-ink-850/90",
        className,
      )}
    >
      <PrefetchLink
        href={`/phim/${movie.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
      >
        <div className="oriental-frame shine-effect relative aspect-video overflow-hidden rounded-lg border border-ink-700 bg-ink-850 transition-colors duration-300 group-hover:border-gold-400/55">
          {movie.posterUrl ? (
            <SafeImage
              src={movie.posterUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              priority={priority}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-ink-800 to-ink-900 p-4 text-center">
              <span className="font-serif text-sm text-parchment-300/80">{movie.title}</span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink-950/95 via-ink-950/45 to-transparent" />

          <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1">
            <Badge
              variant={
                movie.releaseStatus === "airing"
                  ? "jade"
                  : movie.releaseStatus === "upcoming"
                    ? "gold"
                    : "outline"
              }
              className="backdrop-blur-md"
            >
              {movie.releaseStatus === "airing" && (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-jade-300 animate-pulse"
                />
              )}
              {RELEASE_LABELS[movie.releaseStatus]}
            </Badge>
            {movie.subtitleLabel && (
              <Badge variant="default" className="bg-ink-950/85 backdrop-blur-md">
                {SUBTITLE_LABELS[movie.subtitleLabel]}
              </Badge>
            )}
          </div>

          {movie.genres.length > 0 && (
            <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-1">
              {movie.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre.id}
                  className="rounded border border-ink-600/80 bg-ink-950/80 px-2 py-0.5 text-xs text-parchment-200 backdrop-blur-sm transition-colors group-hover:border-gold-500/35 group-hover:text-gold-100"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          {published > 0 && (
            <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 focus-visible:opacity-100">
              <span className="play-ripple relative grid size-11 place-items-center rounded-full border border-gold-200/80 bg-gradient-to-br from-gold-300 to-gold-500 text-ink-950 shadow-[0_0_24px_rgba(212,175,55,0.75)] transition-transform duration-300 group-hover:scale-105">
                <Play className="size-4 fill-current translate-x-[0.5px]" aria-hidden="true" />
                <span className="sr-only">Xem {movie.title}</span>
              </span>
            </div>
          )}
        </div>
      </PrefetchLink>

      {/* Nút Lưu Phim vào Tàng Kinh Các (Icon Trái Tim / Ngọc Bội) */}
      <div className="absolute right-4 top-4 z-20">
        <BookmarkButton
          movieId={movie.id}
          slug={movie.slug}
          title={movie.title}
          originalTitle={movie.originalTitle}
          posterUrl={movie.posterUrl}
          year={movie.year}
          publishedEpisodeCount={movie.publishedEpisodeCount}
        />
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1 px-0.5">
        <h3 className="font-serif text-lg font-semibold leading-snug text-parchment-100 transition-colors group-hover:text-gold-200">
          <PrefetchLink href={`/phim/${movie.slug}`} className="link-underline">
            {movie.title}
          </PrefetchLink>
        </h3>
        <p className="truncate text-xs text-mist-400">
          {movie.year ?? "—"}
          {movie.originalTitle ? ` · ${movie.originalTitle}` : ""}
        </p>

        {showProgress && (
          <div className="mt-auto pt-2.5">
            <div className="flex items-center justify-between text-xs text-mist-400">
              <span className="font-medium text-parchment-200/90">
                {published > 0 ? `Tập ${published}` : "Chưa có tập"}
                {total > published ? ` / ${total}` : ""}
              </span>
              {total > 0 && <span className="tabular-nums text-gold-300/90">{progress}%</span>}
            </div>
            <div
              className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-750"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tiến độ xem ${movie.title}`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-500 via-gold-400 to-gold-200 transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
