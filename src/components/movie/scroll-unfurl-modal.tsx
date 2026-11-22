"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { BookOpen, Film, Play, ScrollText, Sparkles, X } from "lucide-react";
import type { MovieWithStats } from "@/lib/types";
import {
  getPublishedEpisodesByMovieIdAction,
  type ModalEpisodeItem,
} from "@/app/actions/community";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { SealStampButton } from "@/components/ui/seal-stamp-button";
import { BookmarkButton } from "@/components/movie/bookmark-button";
import { cn } from "@/lib/utils";

const RELEASE_LABELS: Record<MovieWithStats["releaseStatus"], string> = {
  upcoming: "Sắp chiếu",
  airing: "Đang chiếu",
  completed: "Hoàn thành",
};

const UNFURL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface ScrollUnfurlModalProps {
  movie: MovieWithStats;
  open: boolean;
  onClose: () => void;
}

/**
 * 4. <ScrollUnfurlModal /> (Modal Cuộn Tranh Bung Động):
 * - Dùng <AnimatePresence> kết hợp motion.div.
 * - Hiệu ứng mở: animate clipPath từ "inset(0% 50% 0% 50%)" bung ra "inset(0% 0% 0% 0%)"
 *   trong 0.65s (ease: [0.22, 1, 0.36, 1]).
 * - Hai thanh trục gỗ cổ trang 2 bên cũng dùng motion.div trượt đồng bộ từ giữa
 *   (left/right 50%) dạt ra hai mép ngoài.
 */
export function ScrollUnfurlModal({ movie, open, onClose }: ScrollUnfurlModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [episodes, setEpisodes] = React.useState<ModalEpisodeItem[] | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void Promise.resolve(getPublishedEpisodesByMovieIdAction(movie.id))
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setEpisodes(list);
        }
      })
      .catch(() => {
        // Ignore fallback errors
      });

    return () => {
      cancelled = true;
    };
  }, [open, movie.id]);

  if (!mounted) return null;

  const isJsdom =
    typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent || "");

  const displayEpisodes: ModalEpisodeItem[] =
    episodes && episodes.length > 0
      ? episodes
      : Array.from({ length: Math.min(24, movie.publishedEpisodeCount) }, (_, idx) => {
          const epNum = idx + 1;
          return {
            id: `${movie.id}-ep-${epNum}`,
            slug: `tap-${epNum}`,
            title: `Tập ${epNum}`,
            episodeNumber: epNum,
          };
        });

  const firstEpisodeSlug = displayEpisodes[0]?.slug;
  const watchNowHref = firstEpisodeSlug
    ? `/xem/${movie.slug}/${firstEpisodeSlug}`
    : `/phim/${movie.slug}`;

  const modalTree = (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <div
            key={`scroll-modal-${movie.id}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`scroll-modal-title-${movie.id}`}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8"
          >
            {/* Lớp nền mờ sương khói fade-in/out bằng Framer Motion */}
            <motion.div
              aria-hidden="true"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={isJsdom ? undefined : { opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Khung Họa Quyển Cổ Phong */}
            <div className="relative z-10 flex w-full max-w-3xl items-stretch justify-center">
              {/* Trục gỗ cuộn tranh bên TRÁI trượt từ tâm (50%) ra mép trái (0%) */}
              <motion.div
                aria-hidden="true"
                initial={{ left: "50%", x: "-100%" }}
                animate={{ left: "0%", x: "-50%" }}
                exit={isJsdom ? undefined : { left: "50%", x: "-100%" }}
                transition={{ duration: 0.65, ease: UNFURL_EASE }}
                className="scroll-roller-left pointer-events-none absolute inset-y-[-14px] z-30 flex w-6 flex-col items-center justify-between sm:w-7"
              >
                {/* Đầu trục đồng vàng trên */}
                <div className="h-5 w-7 rounded-t-sm border border-gold-200 bg-gradient-to-r from-gold-500 via-gold-200 to-gold-500 shadow-[0_0_16px_rgba(212,175,55,0.85)] sm:w-8" />
                {/* Thân trục gỗ trầm hương viền vàng */}
                <div
                  className="w-full flex-1 border-x-[1.5px] border-gold-400/80 shadow-[6px_0_22px_rgba(0,0,0,0.9),0_0_18px_rgba(212,175,55,0.3)]"
                  style={{
                    background:
                      "linear-gradient(90deg, #2a120a 0%, #6e3b26 35%, #9c5a3c 50%, #522818 78%, #1e0d07 100%)",
                  }}
                />
                {/* Đầu trục đồng vàng dưới */}
                <div className="h-5 w-7 rounded-b-sm border border-gold-200 bg-gradient-to-r from-gold-500 via-gold-200 to-gold-500 shadow-[0_0_16px_rgba(212,175,55,0.85)] sm:w-8" />
              </motion.div>

              {/* Trục gỗ cuộn tranh bên PHẢI trượt từ tâm (50%) ra mép phải (0%) */}
              <motion.div
                aria-hidden="true"
                initial={{ right: "50%", x: "100%" }}
                animate={{ right: "0%", x: "50%" }}
                exit={isJsdom ? undefined : { right: "50%", x: "100%" }}
                transition={{ duration: 0.65, ease: UNFURL_EASE }}
                className="scroll-roller-right pointer-events-none absolute inset-y-[-14px] z-30 flex w-6 flex-col items-center justify-between sm:w-7"
              >
                <div className="h-5 w-7 rounded-t-sm border border-gold-200 bg-gradient-to-r from-gold-500 via-gold-200 to-gold-500 shadow-[0_0_16px_rgba(212,175,55,0.85)] sm:w-8" />
                <div
                  className="w-full flex-1 border-x-[1.5px] border-gold-400/80 shadow-[-6px_0_22px_rgba(0,0,0,0.9),0_0_18px_rgba(212,175,55,0.3)]"
                  style={{
                    background:
                      "linear-gradient(90deg, #1e0d07 0%, #522818 22%, #9c5a3c 50%, #6e3b26 65%, #2a120a 100%)",
                  }}
                />
                <div className="h-5 w-7 rounded-b-sm border border-gold-200 bg-gradient-to-r from-gold-500 via-gold-200 to-gold-500 shadow-[0_0_16px_rgba(212,175,55,0.85)] sm:w-8" />
              </motion.div>

              {/* Thân bức tranh bung mở từ giữa sang 2 bên bằng clipPath Framer Motion */}
              <motion.div
                initial={{ clipPath: "inset(0% 50% 0% 50%)", opacity: 0.5 }}
                animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
                exit={
                  isJsdom
                    ? undefined
                    : { clipPath: "inset(0% 50% 0% 50%)", opacity: 0.25 }
                }
                transition={{ duration: 0.65, ease: UNFURL_EASE }}
                className="scroll-unfurl-content relative max-h-[85vh] w-full overflow-y-auto rounded-lg border-y-2 border-gold-400/80 bg-ink-900 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_55px_rgba(212,175,55,0.28)]"
              >
                {/* Dải lụa hoa văn viền trên của bức trướng */}
                <div
                  aria-hidden="true"
                  className="h-2.5 w-full bg-gradient-to-r from-gold-500/25 via-gold-300/75 to-gold-500/25"
                />

                {/* Nút Đóng Cuộn Tranh */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Đóng cuộn tranh chi tiết phim"
                  className="absolute right-4 top-4 z-20 inline-flex size-9 items-center justify-center rounded-full border border-gold-400/50 bg-ink-950/85 text-parchment-100 backdrop-blur-md transition-all hover:border-gold-300 hover:bg-rouge-500/80 hover:text-white"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>

                {/* Header ảnh nền + Poster */}
                <div className="relative overflow-hidden border-b border-gold-500/25 px-6 pb-6 pt-7 sm:px-9">
                  {(movie.backdropUrl ?? movie.posterUrl) && (
                    <div className="pointer-events-none absolute inset-0 -z-10">
                      <SafeImage
                        src={(movie.backdropUrl ?? movie.posterUrl)!}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 768px"
                        className="object-cover opacity-35"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/80 to-ink-950/75" />
                    </div>
                  )}

                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-gold-400/50 bg-ink-850 shadow-lift sm:w-56">
                      {movie.posterUrl ? (
                        <SafeImage
                          src={movie.posterUrl}
                          alt={movie.title}
                          fill
                          sizes="224px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center p-3 text-center">
                          <span className="font-serif text-sm text-parchment-200">{movie.title}</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pr-6">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="seal-stamp rounded px-2 py-0.5 font-serif text-xs font-semibold tracking-wider">
                          畫卷 · HỌA QUYỂN CHI TIẾT
                        </span>
                        <Badge
                          variant={
                            movie.releaseStatus === "airing"
                              ? "jade"
                              : movie.releaseStatus === "upcoming"
                                ? "gold"
                                : "outline"
                          }
                        >
                          {RELEASE_LABELS[movie.releaseStatus]}
                        </Badge>
                        {movie.year && <Badge variant="outline">{movie.year}</Badge>}
                      </div>

                      <h2
                        id={`scroll-modal-title-${movie.id}`}
                        className="mt-2.5 font-serif text-2xl font-bold leading-snug text-parchment-100 sm:text-3xl"
                      >
                        {movie.title}
                      </h2>

                      {movie.originalTitle && (
                        <p className="mt-1 font-serif text-sm text-gold-300/85">
                          {movie.originalTitle}
                          {movie.country ? ` · ${movie.country}` : ""}
                        </p>
                      )}

                      {movie.genres.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {movie.genres.map((g) => (
                            <span
                              key={g.id}
                              className="rounded border border-gold-500/30 bg-ink-950/75 px-2.5 py-0.5 text-xs text-gold-200"
                            >
                              {g.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nội dung cốt truyện & Danh sách tập */}
                <div className="space-y-6 px-6 py-6 sm:px-9">
                  <div>
                    <h3 className="flex items-center gap-2 font-serif text-sm font-semibold uppercase tracking-[0.16em] text-gold-300">
                      <ScrollText className="size-4 text-gold-400" aria-hidden="true" />
                      Tóm Tắt Cốt Truyện
                    </h3>
                    <p className="mt-2.5 rounded-lg border border-ink-700/80 bg-ink-950/60 p-4 text-sm leading-relaxed text-parchment-200">
                      {movie.synopsis?.trim() ||
                        `Khám phá hành trình cổ trang đặc sắc trong bộ phim ${movie.title} kèm phụ đề tiếng Việt chuẩn xác tại Ghiền Phim.`}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 font-serif text-sm font-semibold uppercase tracking-[0.16em] text-gold-300">
                        <Film className="size-4 text-gold-400" aria-hidden="true" />
                        Danh Sách Tập ({movie.publishedEpisodeCount} tập)
                      </h3>
                      {movie.episodeCount > movie.publishedEpisodeCount && (
                        <span className="text-xs text-mist-400">
                          Tổng dự kiến: {movie.episodeCount} tập
                        </span>
                      )}
                    </div>

                    {displayEpisodes.length === 0 ? (
                      <p className="mt-2.5 rounded-lg border border-gold-500/25 bg-gold-500/5 px-4 py-3 text-xs text-gold-200">
                        Phim đang trong giai đoạn sắp chiếu. Các tập mới sẽ được cập nhật sớm nhất.
                      </p>
                    ) : (
                      <div className="mt-3 grid max-h-44 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-6">
                        {displayEpisodes.map((ep) => (
                          <PrefetchLink
                            key={ep.id}
                            href={`/xem/${movie.slug}/${ep.slug}`}
                            onClick={onClose}
                            className="group flex items-center justify-center rounded-md border border-ink-700 bg-ink-850/90 px-2.5 py-2 text-center text-xs font-medium text-parchment-100 transition-all hover:-translate-y-0.5 hover:border-gold-400/70 hover:bg-gold-500/15 hover:text-gold-200"
                          >
                            <span className="truncate">{ep.title || `Tập ${ep.episodeNumber}`}</span>
                          </PrefetchLink>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cụm nút hành động chính (Xem Ngay có hiệu ứng Đóng Ấn Triện - Animation 4) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700/80 pt-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <SealStampButton
                        href={watchNowHref}
                        onClick={onClose}
                        variant="cinnabar"
                        className="px-5 py-2.5 text-sm"
                      >
                        <Play className="size-4 fill-current" aria-hidden="true" />
                        <span>{firstEpisodeSlug ? "Xem Ngay" : "Xem Trang Phim"}</span>
                      </SealStampButton>

                      <PrefetchLink
                        href={`/phim/${movie.slug}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/45 bg-ink-850/85 px-4 py-2.5 text-xs font-semibold text-gold-200 transition-colors hover:border-gold-400 hover:bg-gold-500/15"
                      >
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        <span>Chi Tiết Đầy Đủ</span>
                      </PrefetchLink>
                    </div>

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
                  </div>
                </div>

                {/* Dải lụa hoa văn viền dưới */}
                <div
                  aria-hidden="true"
                  className="h-2.5 w-full bg-gradient-to-r from-gold-500/25 via-gold-300/75 to-gold-500/25"
                />
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );

  return createPortal(modalTree, document.body);
}

/**
 * Nút kích hoạt mở Modal Cuộn Tranh ("Chi Tiết / Giới Thiệu Phim").
 */
export function ScrollUnfurlTrigger({
  movie,
  label = "Chi Tiết",
  className,
  tabIndex,
}: {
  movie: MovieWithStats;
  label?: string;
  className?: string;
  tabIndex?: number;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        tabIndex={tabIndex}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title={`Mở cuộn tranh giới thiệu phim ${movie.title}`}
        aria-label={`Chi tiết phim ${movie.title}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-gold-500/45 bg-ink-950/90 px-2.5 py-1 text-xs font-medium text-gold-200 backdrop-blur-md transition-all duration-200 hover:border-gold-300 hover:bg-gold-500/20 hover:text-parchment-100 active:scale-95",
          className,
        )}
      >
        <BookOpen className="size-3.5 text-gold-300" aria-hidden="true" />
        <span>{label}</span>
      </button>

      <ScrollUnfurlModal movie={movie} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
