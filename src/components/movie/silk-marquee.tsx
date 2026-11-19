"use client";

import * as React from "react";
import { Play, Sparkles } from "lucide-react";
import type { MovieWithStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { SealStampButton } from "@/components/ui/seal-stamp-button";
import { ScrollUnfurlTrigger } from "@/components/movie/scroll-unfurl-modal";
import { AmbientParticles } from "@/components/effects/ambient-particles";

interface SilkMarqueeProps {
  movies: MovieWithStats[];
}

const RELEASE_LABELS: Record<MovieWithStats["releaseStatus"], string> = {
  upcoming: "Sắp chiếu",
  airing: "Đang chiếu",
  completed: "Hoàn thành",
};

/**
 * "Tuyệt Phẩm Cổ Trang & Tiên Hiệp" — Infinite Silk Marquee
 *
 * - Khi chỉ có 1 phim (`uniqueMovies.length === 1`): hiển thị 1 thẻ đứng im.
 * - Khi có từ 2 phim trở lên (`uniqueMovies.length >= 2`):
 *   1. Lặp bội số nguyên của `uniqueMovies` thành `baseTrack` đủ tối thiểu 6 thẻ
 *      (`>= 2460px`) để nửa sau của dải luôn phủ kín màn hình lớn khi nửa đầu
 *      đã trượt hết sang trái (không bao giờ hở khoảng trống bên phải).
 *   2. Nhân đôi `[...baseTrack, ...baseTrack]` và đặt `margin-right: 20px` đều
 *      trên mọi thẻ (không dùng `gap` hay `padding-x` trên track) để vị trí
 *      `-50%` trùng khớp tuyệt đối `0.00px` với `0%`, tạo vòng lặp vô tận không
 *      giật và không bao giờ dừng.
 */
export function SilkMarquee({ movies }: SilkMarqueeProps) {
  const uniqueMovies = React.useMemo(() => {
    const seen = new Set<string>();
    const list: MovieWithStats[] = [];
    for (const movie of movies) {
      if (movie && !seen.has(movie.id)) {
        seen.add(movie.id);
        list.push(movie);
      }
    }
    return list;
  }, [movies]);

  const isSingle = uniqueMovies.length === 1;

  // Xây dựng nửa chu kỳ cơ sở (`baseTrack`) có độ dài là bội số nguyên của
  // `uniqueMovies.length` và >= 6 thẻ để luôn rộng hơn màn hình (tránh khoảng trống).
  const baseTrack = React.useMemo(() => {
    if (uniqueMovies.length === 0) return [];
    if (uniqueMovies.length === 1) return uniqueMovies;
    const minCards = 6;
    const repeatCount = Math.max(1, Math.ceil(minCards / uniqueMovies.length));
    const track: MovieWithStats[] = [];
    for (let i = 0; i < repeatCount; i += 1) {
      track.push(...uniqueMovies);
    }
    return track;
  }, [uniqueMovies]);

  if (baseTrack.length === 0) return null;

  // Nhân đôi đúng 2 nửa giống hệt nhau để dịch chuyển 0% -> -50% khớp 100% theo vòng lặp vô tận
  const marqueeItems = isSingle ? baseTrack : [...baseTrack, ...baseTrack];
  // Tốc độ đồng đều ~4s mỗi thẻ
  const durationSeconds = Math.max(20, baseTrack.length * 4);

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden border-b border-ink-700/70 bg-gradient-to-b from-ink-900/70 via-ink-950 to-ink-950 py-10 sm:py-14"
    >
      <style>{`
        @keyframes forceSilkMarqueeLeft {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .silk-marquee-track {
          display: flex;
          width: max-content;
          padding: 0;
          gap: 0;
          animation-name: forceSilkMarqueeLeft !important;
          animation-duration: ${durationSeconds}s !important;
          animation-timing-function: linear !important;
          animation-iteration-count: infinite !important;
          animation-direction: normal !important;
          animation-fill-mode: none !important;
          animation-play-state: running !important;
          will-change: transform;
        }
        .silk-marquee-wrapper:hover .silk-marquee-track,
        .silk-marquee-wrapper:focus-within .silk-marquee-track {
          animation-play-state: paused !important;
        }
        .silk-marquee-card {
          margin-right: 20px;
          transition:
            transform 0.38s cubic-bezier(0.22, 1, 0.36, 1) !important,
            opacity 0.32s ease !important,
            border-color 0.32s ease !important,
            box-shadow 0.38s cubic-bezier(0.22, 1, 0.36, 1) !important;
          will-change: transform, opacity;
        }
        .silk-marquee-wrapper:hover .silk-marquee-track .silk-marquee-card {
          opacity: 0.5;
        }
        .silk-marquee-wrapper:hover .silk-marquee-card:hover,
        .silk-marquee-wrapper .silk-marquee-card:focus-within {
          opacity: 1 !important;
          transform: translate3d(0, -6px, 0) scale(1.08) !important;
          border-color: #D4AF37 !important;
          box-shadow:
            0 20px 44px -12px rgba(0, 0, 0, 0.92),
            0 0 28px -2px rgba(212, 175, 55, 0.55) !important;
          z-index: 30;
        }
      `}</style>

      {/* Quầng sáng nền cổ phong */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(212,175,55,0.14),transparent_70%)]"
      />

      {/* Animation 1: Lá Phong / Hoa Đào Rơi & Đom Đóm (Ambient Particles Canvas) */}
      <AmbientParticles />

      <div className="relative z-20 mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="text-shadow-hero flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <span className="seal-stamp rounded px-2 py-0.5 font-serif text-xs font-semibold tracking-widest">
                御覽 · TINH HOA CỔ TRANG
              </span>
              <Badge variant="gold">
                <Sparkles className="size-3" aria-hidden="true" />
                Tuyển tập nổi bật
              </Badge>
            </div>
            <h1
              id="hero-title"
              className="font-serif text-3xl font-bold tracking-tight text-parchment-100 sm:text-4xl lg:text-5xl"
            >
              Tuyệt Phẩm Cổ Trang &amp; Tiên Hiệp
            </h1>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-parchment-300/85 sm:text-right sm:text-sm">
            {isSingle
              ? "Rê chuột vào thẻ phim để khám phá chi tiết và thưởng thức ngay."
              : "Rê chuột vào dải lụa để dừng chuyển động và khám phá nhanh từng bộ phim nổi bật."}
          </p>
        </div>
      </div>

      {/* Dải lụa: đứng im khi chỉ có 1 phim, trượt ngang theo vòng lặp vô tận khi có từ 2 phim trở lên */}
      <div
        className={
          isSingle
            ? "silk-marquee-wrapper relative z-20 mx-auto mt-7 max-w-[1400px] px-4 py-5 sm:px-6"
            : "silk-marquee-wrapper silk-marquee-mask relative z-20 mt-7 overflow-hidden py-5"
        }
      >
        <div className={isSingle ? "flex justify-start" : "silk-marquee-track"}>
          {marqueeItems.map((movie, index) => {
            const isDuplicate = !isSingle && index >= uniqueMovies.length;
            const imageSrc = movie.backdropUrl ?? movie.posterUrl;
            const published = movie.publishedEpisodeCount;

            return (
              <div
                key={`${movie.id}-${index}`}
                aria-hidden={isDuplicate ? "true" : undefined}
                className="silk-marquee-card cultivation-card group relative w-[290px] shrink-0 overflow-hidden rounded-xl border border-gold-500/25 bg-ink-900 shadow-card sm:w-[350px] lg:w-[390px]"
              >
                <span aria-hidden="true" className="cultivation-border-beam" />
                <div className="relative aspect-video w-full overflow-hidden bg-ink-850">
                  {imageSrc ? (
                    <SafeImage
                      src={imageSrc}
                      alt={isDuplicate ? "" : movie.title}
                      fill
                      priority={index < 4}
                      sizes="(max-width: 640px) 290px, 390px"
                      className="cultivation-poster-img object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-ink-800 to-ink-900 p-4 text-center">
                      <span className="font-serif text-base text-parchment-200">{movie.title}</span>
                    </div>
                  )}

                  {/* Lớp phủ chuyển sắc làm nổi chữ và nút Xem Ngay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-transparent" />

                  <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                    {movie.isFeatured && (
                      <Badge variant="gold" className="backdrop-blur-md">
                        Đề cử
                      </Badge>
                    )}
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
                      {RELEASE_LABELS[movie.releaseStatus]}
                    </Badge>
                  </div>

                  {published > 0 && (
                    <span className="absolute right-3 top-3 rounded-md border border-gold-500/35 bg-ink-950/85 px-2 py-0.5 text-xs font-medium text-gold-200 backdrop-blur-md">
                      {published} tập
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-lg font-bold leading-snug text-parchment-100 transition-colors group-hover:text-gold-200 sm:text-xl">
                        {movie.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-parchment-300/85">
                        {movie.originalTitle ?? movie.country ?? "Trung Quốc"}
                        {movie.year ? ` · ${movie.year}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <ScrollUnfurlTrigger
                        movie={movie}
                        label="Chi Tiết"
                        tabIndex={isDuplicate ? -1 : 0}
                        className="py-2"
                      />
                      <SealStampButton
                        href={`/phim/${movie.slug}`}
                        tabIndex={isDuplicate ? -1 : 0}
                        variant="cinnabar"
                        className="px-3.5 py-2 text-xs"
                      >
                        <Play className="size-3.5 fill-current" aria-hidden="true" />
                        <span>Xem Ngay</span>
                      </SealStampButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
