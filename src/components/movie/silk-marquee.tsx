"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Sparkles } from "lucide-react";
import type { MovieWithStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { ScrollUnfurlTrigger } from "@/components/movie/scroll-unfurl-modal";
import { cn } from "@/lib/utils";

interface SilkMarqueeProps {
  movies: MovieWithStats[];
}

const RELEASE_LABELS: Record<MovieWithStats["releaseStatus"], string> = {
  upcoming: "Sắp chiếu",
  airing: "Đang chiếu",
  completed: "Hoàn thành",
};

const slideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 56 : -56,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -56 : 56,
  }),
};

type HoverZone = "left" | "right" | null;

/**
 * Đêm Đèn Lồng Giấy Gió — First-viewport Hero Showcase
 *
 * Đặt bộ phim tiêu điểm vào trung tâm với viền sáng hổ phách ấm trên nền
 * đêm chàm tĩnh lặng. Rê chuột vào vùng mép trái hoặc mép phải của Hero
 * để trượt sang bộ phim trước/tiếp theo mà không che nút hay ảnh phim.
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

  const featuredList = React.useMemo(() => uniqueMovies.slice(0, 6), [uniqueMovies]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [hoverZone, setHoverZone] = React.useState<HoverZone>(null);
  const hoverZoneRef = React.useRef<HoverZone>(null);

  const totalItems = featuredList.length;

  const stepBy = React.useCallback(
    (delta: -1 | 1) => {
      if (totalItems <= 1) return;
      setDirection(delta);
      setActiveIndex((prev) => (prev + delta + totalItems) % totalItems);
    },
    [totalItems],
  );

  // Nếu giữ chuột trong vùng mép trái/phải, tự động trượt tiếp mỗi 1.8s
  React.useEffect(() => {
    if (!hoverZone || totalItems <= 1) return;
    const delta = hoverZone === "left" ? -1 : 1;
    const timer = window.setInterval(() => {
      stepBy(delta);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [hoverZone, totalItems, stepBy]);

  if (featuredList.length === 0) return null;

  const activeMovie = featuredList[activeIndex] ?? featuredList[0]!;
  const heroImage = activeMovie.backdropUrl ?? activeMovie.posterUrl;
  const published = activeMovie.publishedEpisodeCount;
  const total = activeMovie.episodeCount;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (totalItems <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;

    // 14% mép trái và 14% mép phải là vùng cảm ứng trượt
    const nextZone: HoverZone = ratio <= 0.14 ? "left" : ratio >= 0.86 ? "right" : null;

    if (nextZone !== hoverZoneRef.current) {
      hoverZoneRef.current = nextZone;
      setHoverZone(nextZone);
      if (nextZone === "left") stepBy(-1);
      else if (nextZone === "right") stepBy(1);
    }
  };

  const handleMouseLeave = () => {
    hoverZoneRef.current = null;
    setHoverZone(null);
  };

  const selectIndex = (idx: number) => {
    if (idx === activeIndex) return;
    setDirection(idx > activeIndex ? 1 : -1);
    setActiveIndex(idx);
  };

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-labelledby="hero-title"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative isolate overflow-hidden border-b border-ink-700/80 bg-ink-900 py-8 sm:py-12"
      >
        {/* Quầng sáng đèn lồng hổ phách nhẹ phía sau khung hình tiêu điểm */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_60%_at_74%_42%,rgba(244,184,96,0.12),transparent_68%),radial-gradient(ellipse_60%_50%_at_20%_10%,rgba(28,39,66,0.55),transparent_70%)]"
        />

        {/* Hiệu ứng ánh sáng vùng mép trái / phải (chỉ hiển thị thị giác, không chặn click) */}
        {totalItems > 1 && (
          <>
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 z-20 flex w-[14%] items-center justify-start bg-gradient-to-r from-gold-400/12 via-ink-950/25 to-transparent pl-3 transition-opacity duration-200 sm:pl-5",
                hoverZone === "left" ? "opacity-100" : "opacity-0",
              )}
            >
              <span className="grid size-9 place-items-center rounded-full border border-gold-400/60 bg-ink-900/90 text-gold-300 shadow-[0_0_20px_-4px_rgba(244,184,96,0.45)] backdrop-blur-sm">
                <ChevronLeft className="size-5" />
              </span>
            </div>

            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 z-20 flex w-[14%] items-center justify-end bg-gradient-to-l from-gold-400/12 via-ink-950/25 to-transparent pr-3 transition-opacity duration-200 sm:pr-5",
                hoverZone === "right" ? "opacity-100" : "opacity-0",
              )}
            >
              <span className="grid size-9 place-items-center rounded-full border border-gold-400/60 bg-ink-900/90 text-gold-300 shadow-[0_0_20px_-4px_rgba(244,184,96,0.45)] backdrop-blur-sm">
                <ChevronRight className="size-5" />
              </span>
            </div>
          </>
        )}

        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={activeMovie.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10"
              >
                {/* Cột trái: Thông tin phim tiêu điểm & CTA */}
                <div className="space-y-5 lg:col-span-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="gold">
                      <Sparkles className="size-3" aria-hidden="true" />
                      Tiêu điểm đêm nay
                    </Badge>
                    <Badge
                      variant={
                        activeMovie.releaseStatus === "airing"
                          ? "jade"
                          : activeMovie.releaseStatus === "upcoming"
                            ? "gold"
                            : "outline"
                      }
                    >
                      {RELEASE_LABELS[activeMovie.releaseStatus]}
                    </Badge>
                    {published > 0 && (
                      <span className="rounded-md border border-ink-700 bg-ink-800 px-2.5 py-0.5 text-xs font-medium tabular-nums text-parchment-200">
                        {total > 0 ? `Tập ${published}/${total}` : `${published} tập`} · Vietsub
                      </span>
                    )}
                  </div>

                  <div>
                    <h1
                      id="hero-title"
                      className="font-serif text-3xl font-bold tracking-tight text-parchment-100 sm:text-4xl lg:text-5xl"
                    >
                      {activeMovie.title}
                    </h1>
                    {activeMovie.originalTitle && (
                      <p className="mt-1.5 text-sm text-mist-400">
                        {activeMovie.originalTitle}
                        {activeMovie.year ? ` · ${activeMovie.year}` : ""}
                        {activeMovie.country ? ` · ${activeMovie.country}` : ""}
                      </p>
                    )}
                  </div>

                  {activeMovie.synopsis && (
                    <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-mist-300 sm:text-base">
                      {activeMovie.synopsis}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link
                      href={`/phim/${activeMovie.slug}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-gold-400 px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_0_24px_-4px_rgba(244,184,96,0.45)] transition-all duration-200 hover:bg-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
                    >
                      <Play className="size-4 fill-current" aria-hidden="true" />
                      <span>Xem ngay</span>
                    </Link>
                    <ScrollUnfurlTrigger
                      movie={activeMovie}
                      label="Chi tiết"
                      className="rounded-lg border border-ink-700 bg-ink-800 px-4 py-2.5 text-sm font-medium text-parchment-100 transition-colors hover:border-gold-400/50 hover:text-gold-300"
                    />
                  </div>
                </div>

                {/* Cột phải: Khung phim viền sáng đèn lồng hổ phách */}
                <div className="lg:col-span-6">
                  <Link
                    href={`/phim/${activeMovie.slug}`}
                    className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-gold-400/50 bg-ink-850 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.85),0_0_36px_-10px_rgba(244,184,96,0.28)] transition-all duration-300 hover:border-gold-300/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                  >
                    {heroImage ? (
                      <SafeImage
                        src={heroImage}
                        alt={activeMovie.title}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 680px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-gradient-to-br from-ink-800 to-ink-950 p-6 text-center">
                        <span className="font-serif text-xl text-parchment-200">
                          {activeMovie.title}
                        </span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/75 via-transparent to-transparent" />
                    <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-parchment-200">
                      <span className="truncate font-medium">
                        {activeMovie.genres
                          .map((g) => g.name)
                          .slice(0, 3)
                          .join(" · ")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/50 bg-ink-950/80 px-2.5 py-1 text-gold-300 backdrop-blur-sm">
                        <Play className="size-3 fill-current" aria-hidden="true" />
                        Phát ngay
                      </span>
                    </div>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dải chọn nhanh các phim tiêu điểm */}
          {totalItems > 1 && (
            <div className="mt-7 flex items-center gap-2.5 overflow-x-auto pb-1">
              {featuredList.map((m, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectIndex(idx)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                      isActive
                        ? "border-gold-400/70 bg-ink-800 text-parchment-100 shadow-[0_0_20px_-6px_rgba(244,184,96,0.3)]"
                        : "border-ink-700 bg-ink-850/70 text-mist-300 hover:border-ink-600 hover:bg-ink-800 hover:text-parchment-100",
                    )}
                  >
                    <span className="text-xs font-semibold tabular-nums text-gold-400">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="max-w-[160px] truncate text-xs font-medium sm:text-sm">
                      {m.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}
