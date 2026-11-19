"use client";

import * as React from "react";
import { MotionConfig, motion } from "framer-motion";
import { Play } from "lucide-react";
import type { MovieWithStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { SafeImage } from "@/components/ui/safe-image";
import { BookmarkButton } from "@/components/movie/bookmark-button";
import { ScrollUnfurlTrigger } from "@/components/movie/scroll-unfurl-modal";
import { cn } from "@/lib/utils";

export interface MovieCardProps {
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

/**
 * 3. <CultivationMovieCard /> (Thẻ Phim Hào Quang Kiếm Khí):
 * - Dùng CSS @keyframes border-spin (transform: rotate(360deg) liên tục trong 3s linear infinite)
 *   trên lớp nền conic-gradient(transparent 260deg, #D4AF37 360deg) ẩn bên dưới viền thẻ,
 *   chỉ hiện ra khi hover để vệt sáng chạy vòng quanh viền liên tục.
 * - Kết hợp motion.div với whileHover={{ scale: 1.05 }} (spring physics) và nút Play hình ấn triện ở tâm.
 */
export function CultivationMovieCard({
  movie,
  showProgress = true,
  priority = false,
  className,
}: MovieCardProps) {
  const published = movie.publishedEpisodeCount;
  const total = movie.episodeCount;
  const progress = total > 0 ? Math.min(100, Math.round((published / total) * 100)) : 0;

  return (
    <MotionConfig reducedMotion="never">
      <motion.article
        whileHover={{ scale: 1.03, y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={cn(
          "cultivation-card group relative flex flex-col overflow-hidden rounded-xl border border-gold-500/25 bg-ink-900/75 p-2.5 shadow-card hover:border-gold-400/60 hover:bg-ink-850/95",
          className,
        )}
      >
        {/* Lớp conic-gradient xoay 360deg liên tục (3s linear infinite) dưới viền thẻ, hiện sáng khi hover */}
        <div
          aria-hidden="true"
          className="cultivation-border-beam pointer-events-none absolute inset-0 z-20 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        >
          <div
            className="animate-border-spin absolute left-1/2 top-1/2 aspect-square w-[230%]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg 260deg, rgba(200, 62, 55, 0.65) 295deg, #D4AF37 340deg, #FFF8DC 355deg, #D4AF37 360deg)",
            }}
          />
        </div>

        <PrefetchLink
          href={`/phim/${movie.slug}`}
          className="relative z-10 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
        >
          <div className="oriental-frame shine-effect relative aspect-video overflow-hidden rounded-lg border border-gold-500/20 bg-ink-850 transition-colors duration-300 group-hover:border-gold-400/65">
            <motion.div
              whileHover={{ scale: 1.06 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="size-full"
            >
              {movie.posterUrl ? (
                <SafeImage
                  src={movie.posterUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                  priority={priority}
                  className="cultivation-poster-img object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center bg-gradient-to-br from-ink-800 to-ink-900 p-4 text-center">
                  <span className="font-serif text-sm text-parchment-300/80">{movie.title}</span>
                </div>
              )}
            </motion.div>

            {/* Lớp phủ tối nhẹ hiện lên khi hover */}
            <div className="pointer-events-none absolute inset-0 bg-ink-950/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink-950/95 via-ink-950/45 to-transparent" />

            <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1">
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
              <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-1">
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

            {/* Nút Play ở tâm có hình dạng Ấn Triện / Ngọc Bội phát sáng */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 focus-visible:opacity-100">
              <span className="jade-seal-play">
                <span className="jade-seal-play-inner">
                  <Play className="size-4 fill-current translate-x-[0.5px]" aria-hidden="true" />
                </span>
                <span className="sr-only">Xem {movie.title}</span>
              </span>
            </div>
          </div>
        </PrefetchLink>

        {/* Nút Lưu Phim vào Tàng Kinh Các (Icon Trái Tim / Ngọc Bội) */}
        <div className="absolute right-4 top-4 z-30">
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

        <div className="relative z-10 mt-3 flex flex-1 flex-col gap-1 px-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 font-serif text-lg font-semibold leading-snug text-parchment-100 transition-colors group-hover:text-gold-200">
              <PrefetchLink href={`/phim/${movie.slug}`} className="link-underline">
                {movie.title}
              </PrefetchLink>
            </h3>
            <ScrollUnfurlTrigger movie={movie} label="Chi tiết" className="shrink-0" />
          </div>
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
      </motion.article>
    </MotionConfig>
  );
}

export const MovieCard = CultivationMovieCard;
