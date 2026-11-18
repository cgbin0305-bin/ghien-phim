"use client";

import * as React from "react";
import { Crown, Eye, Flame, Heart, Play } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { BookmarkButton } from "@/components/movie/bookmark-button";
import type { MovieCommunityStats, ReactionCounts } from "@/app/actions/community";
import type { MovieWithStats } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BangPhongThanProps {
  movies: MovieWithStats[];
  initialStats?: Record<string, MovieCommunityStats>;
}

interface RankedMovie {
  movie: MovieWithStats;
  views: number;
  totalReactions: number;
  heatScore: number;
}

const TOP_TITLES: Record<number, { badge: string; seal: string }> = {
  0: { badge: "Thiên Bảng Đệ Nhất", seal: "壹" },
  1: { badge: "Nhị Phẩm Tiên Tôn", seal: "貳" },
  2: { badge: "Tam Phẩm Kiếm Thánh", seal: "參" },
};

function computeDeterministicBase(movie: MovieWithStats): {
  baseViews: number;
  baseReactions: number;
} {
  const hash = (movie.slug || movie.id)
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const epFactor = Math.max(1, movie.publishedEpisodeCount) * 145;
  const featuredBonus = movie.isFeatured ? 680 : 0;
  const baseViews = 420 + epFactor + featuredBonus + ((hash * 19) % 390);
  const baseReactions =
    18 + (hash % 25) + 12 + ((hash * 3) % 19) + 15 + ((hash * 7) % 22) + 6 + ((hash * 5) % 14);
  return { baseViews, baseReactions };
}

function sumReactions(r: Partial<ReactionCounts> | undefined): number {
  if (!r) return 0;
  return (
    (Number(r.tuyet_pham) || 0) +
    (Number(r.dao_huu) || 0) +
    (Number(r.hong_tap) || 0) +
    (Number(r.cam_dong) || 0)
  );
}

/**
 * "Bảng Phong Thần — Top Tuyệt Phẩm Thịnh Hành" trên Trang Chủ.
 * Xếp hạng Top 5 - 10 bộ phim có lượt xem và tương tác cộng đồng cao nhất.
 */
export function BangPhongThan({ movies, initialStats = {} }: BangPhongThanProps) {
  const [localViews, setLocalViews] = React.useState<Record<string, number>>({});
  const [localReactions, setLocalReactions] = React.useState<Record<string, number>>({});

  const syncLocalMetrics = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const rawViews = window.localStorage.getItem("gheienphim.local-views");
      if (rawViews) {
        const parsed = JSON.parse(rawViews) as Record<string, number>;
        if (parsed && typeof parsed === "object") setLocalViews(parsed);
      }

      const reactMap: Record<string, number> = {};
      for (const m of movies) {
        const keyById = `gheienphim.reactions.${m.id}`;
        const keyBySlug = `gheienphim.reactions.${m.slug}`;
        const raw =
          window.localStorage.getItem(keyById) ?? window.localStorage.getItem(keyBySlug);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ReactionCounts>;
          reactMap[m.id] = sumReactions(parsed);
        }
      }
      setLocalReactions(reactMap);
    } catch {
      // Ignore storage errors.
    }
  }, [movies]);

  React.useEffect(() => {
    syncLocalMetrics();
    window.addEventListener("gheienphim:reactions-change", syncLocalMetrics);
    window.addEventListener("storage", syncLocalMetrics);
    return () => {
      window.removeEventListener("gheienphim:reactions-change", syncLocalMetrics);
      window.removeEventListener("storage", syncLocalMetrics);
    };
  }, [syncLocalMetrics]);

  const ranked = React.useMemo<RankedMovie[]>(() => {
    return movies
      .map((movie) => {
        const { baseViews, baseReactions } = computeDeterministicBase(movie);
        const serverStat = initialStats[movie.id];
        const dbViews = serverStat?.views ?? 0;
        const dbReacts = sumReactions(serverStat?.reactions);

        const clientViews =
          (Number(localViews[movie.id]) || 0) + (Number(localViews[movie.slug]) || 0);
        const clientReacts = Number(localReactions[movie.id]) || 0;

        const views = baseViews + dbViews + clientViews;
        const totalReactions = baseReactions + dbReacts + clientReacts;
        const heatScore = views + totalReactions * 18;

        return {
          movie,
          views,
          totalReactions,
          heatScore,
        };
      })
      .sort((a, b) => b.heatScore - a.heatScore)
      .slice(0, 10);
  }, [movies, initialStats, localViews, localReactions]);

  if (ranked.length === 0) return null;

  return (
    <section aria-labelledby="bang-phong-than" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700/75 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border border-gold-400/60 bg-gradient-to-br from-gold-400/25 to-gold-600/15 font-serif text-base font-bold text-gold-200 shadow-[0_0_16px_rgba(212,175,55,0.35)]">
              榜
            </span>
            <h2
              id="bang-phong-than"
              className="font-serif text-2xl font-bold tracking-tight text-parchment-100 sm:text-3xl"
            >
              Bảng Phong Thần — Top Thịnh Hành
            </h2>
          </div>
          <p className="mt-1.5 text-sm text-parchment-300/85">
            Xếp hạng các tuyệt phẩm cổ trang có lượt xem và linh lực tương tác cao nhất từ đạo hữu.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-xs font-medium text-gold-200">
          <Crown className="size-3.5 text-gold-300" aria-hidden="true" />
          Cập nhật theo thời gian thực
        </span>
      </div>

      <ol className="grid gap-4 lg:grid-cols-2">
        {ranked.map((item, index) => {
          const { movie, views, totalReactions, heatScore } = item;
          const topSpec = TOP_TITLES[index];

          // Phong cách thư pháp cho Top 1 (Vàng Hoàng Kim #D4AF37), Top 2 (Bạc Ngân Hà), Top 3 (Đồng Cổ)
          const rankStyle =
            index === 0
              ? "border-[#D4AF37]/80 bg-gradient-to-b from-[#F5E08E]/30 via-[#D4AF37]/20 to-[#9A7418]/25 text-[#F6E27F] shadow-[0_0_24px_rgba(212,175,55,0.45)]"
              : index === 1
                ? "border-slate-300/65 bg-gradient-to-b from-slate-200/25 via-slate-400/15 to-slate-600/20 text-slate-100 shadow-[0_0_20px_rgba(203,213,225,0.3)]"
                : index === 2
                  ? "border-amber-600/70 bg-gradient-to-b from-amber-400/25 via-amber-700/20 to-amber-900/25 text-amber-200 shadow-[0_0_18px_rgba(217,119,6,0.3)]"
                  : "border-ink-700 bg-ink-900/90 text-mist-400";

          const cardBorder =
            index === 0
              ? "border-[#D4AF37]/55 bg-gradient-to-r from-ink-900/95 via-gold-500/[0.08] to-ink-900/90 shadow-[0_12px_36px_-14px_rgba(212,175,55,0.35)]"
              : index === 1
                ? "border-slate-400/40 bg-ink-900/85"
                : index === 2
                  ? "border-amber-600/40 bg-ink-900/85"
                  : "border-ink-700/80 bg-ink-900/65";

          return (
            <li
              key={movie.id}
              className={cn(
                "group relative flex items-center gap-3.5 rounded-xl border p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-ink-850",
                cardBorder,
              )}
            >
              {/* Số thứ tự cỡ lớn phong cách thư pháp */}
              <div
                aria-hidden="true"
                className={cn(
                  "flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg border font-serif transition-transform duration-300 group-hover:scale-105",
                  rankStyle,
                )}
              >
                <span className="text-2xl font-bold leading-none tabular-nums">
                  {index + 1}
                </span>
                {topSpec && (
                  <span className="mt-0.5 text-xs font-semibold leading-none opacity-90">
                    {topSpec.seal}
                  </span>
                )}
              </div>

              {/* Ảnh Poster */}
              <PrefetchLink
                href={`/phim/${movie.slug}`}
                className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg border border-ink-700 bg-ink-850 sm:w-32"
              >
                {movie.posterUrl ? (
                  <SafeImage
                    src={movie.posterUrl}
                    alt=""
                    fill
                    sizes="128px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid size-full place-items-center bg-ink-900 font-serif text-sm text-gold-300">
                    {movie.title}
                  </div>
                )}
                <div className="absolute inset-0 grid place-items-center bg-ink-950/35 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="grid size-8 place-items-center rounded-full bg-gold-400 text-ink-950 shadow">
                    <Play className="size-3.5 fill-current" aria-hidden="true" />
                  </span>
                </div>
              </PrefetchLink>

              {/* Thông tin phim, lượt xem & độ hot */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {topSpec && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
                        index === 0
                          ? "border-[#D4AF37]/70 bg-[#D4AF37]/20 text-[#F6E27F]"
                          : index === 1
                            ? "border-slate-300/50 bg-slate-300/15 text-slate-100"
                            : "border-amber-500/55 bg-amber-500/15 text-amber-200",
                      )}
                    >
                      <Crown className="size-3" aria-hidden="true" />
                      {topSpec.badge}
                    </span>
                  )}
                  <span className="text-xs text-mist-400">
                    {movie.publishedEpisodeCount > 0
                      ? `${movie.publishedEpisodeCount} tập`
                      : "Sắp chiếu"}
                  </span>
                </div>

                <PrefetchLink
                  href={`/phim/${movie.slug}`}
                  className="block truncate font-serif text-lg font-bold text-parchment-100 transition-colors group-hover:text-gold-200"
                >
                  {movie.title}
                </PrefetchLink>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-parchment-200 tabular-nums">
                    <Eye className="size-3.5 text-gold-300" aria-hidden="true" />
                    {views.toLocaleString("vi-VN")} lượt xem
                  </span>
                  <span className="inline-flex items-center gap-1 text-parchment-200 tabular-nums">
                    <Heart className="size-3.5 text-rouge-300" aria-hidden="true" />
                    {totalReactions.toLocaleString("vi-VN")} cảm xúc
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-gold-300 tabular-nums">
                    <Flame className="size-3.5 text-gold-400" aria-hidden="true" />
                    {heatScore.toLocaleString("vi-VN")} độ hot
                  </span>
                </div>
              </div>

              {/* Nút lưu nhanh vào Tàng Kinh Các */}
              <div className="shrink-0">
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}
