"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookMarked, Heart, Play, Trash2, X } from "lucide-react";
import { useBookmark } from "@/hooks/useBookmark";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Nút "Tàng Kinh Các" trên thanh Navigation Bar kèm Glassmorphism Drawer trượt từ bên phải.
 */
export function TangKinhCacDrawerTrigger() {
  const { bookmarks, count, ready, removeBookmark, clearBookmarks } = useBookmark();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Mở Tàng Kinh Các (${ready ? count : 0} phim đã lưu)`}
        className={cn(
          "group relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-105",
          ready && count > 0
            ? "border-gold-400/60 bg-gold-500/12 text-gold-200 hover:border-gold-300 hover:bg-gold-500/20"
            : "border-ink-700 bg-ink-900/75 text-parchment-200 hover:border-gold-500/45 hover:text-gold-200",
        )}
      >
        <BookMarked
          className="size-3.5 text-gold-300 transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        />
        <span className="hidden md:inline">Tàng Kinh Các</span>
        {ready && count > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-1.5 py-0.5 text-xs font-bold leading-none tabular-nums text-ink-950 shadow-[0_0_10px_rgba(212,175,55,0.6)]">
            {count}
          </span>
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tang-kinh-cac-title"
          >
            {/* Lớp nền mờ */}
            <div
              className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm animate-fade-in"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            />

            {/* Ngăn kéo Glassmorphism trượt từ bên phải */}
            <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-gold-500/35 bg-ink-950/90 shadow-[-20px_0_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-ink-700/80 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg border border-gold-400/50 bg-gold-500/15 font-serif text-sm font-bold text-gold-200">
                    藏
                  </span>
                  <div>
                    <h2
                      id="tang-kinh-cac-title"
                      className="font-serif text-lg font-bold text-parchment-100"
                    >
                      Tàng Kinh Các
                    </h2>
                    <p className="text-xs text-parchment-300/80">
                      Tủ phim yêu thích cá nhân ({bookmarks.length} tuyệt phẩm)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng Tàng Kinh Các"
                  className="grid size-8 place-items-center rounded-full border border-ink-700 bg-ink-900 text-parchment-200 transition-colors hover:border-gold-500/50 hover:text-gold-200"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {bookmarks.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <span className="grid size-14 place-items-center rounded-full border border-gold-500/30 bg-ink-900 text-gold-300">
                      <Heart className="size-6" aria-hidden="true" />
                    </span>
                    <p className="font-serif text-lg font-semibold text-parchment-100">
                      Tàng Kinh Các đang trống
                    </p>
                    <p className="max-w-xs text-xs leading-relaxed text-parchment-300/80">
                      Hãy bấm vào biểu tượng Trái Tim / Ngọc Bội trên các thẻ phim hoặc trang xem phim để thu thập tuyệt phẩm yêu thích vào đây.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {bookmarks.map((movie) => (
                      <li
                        key={movie.slug}
                        className="group relative flex items-center gap-3 rounded-xl border border-ink-700/85 bg-ink-900/75 p-2.5 transition-all duration-200 hover:border-gold-400/50 hover:bg-ink-850"
                      >
                        <Link
                          href={`/phim/${movie.slug}`}
                          onClick={() => setOpen(false)}
                          className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-ink-700 bg-ink-850"
                        >
                          {movie.posterUrl ? (
                            <SafeImage
                              src={movie.posterUrl}
                              alt=""
                              fill
                              sizes="96px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid size-full place-items-center bg-ink-900 font-serif text-xs text-gold-300">
                              古
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0 flex-1 space-y-1">
                          <Link
                            href={`/phim/${movie.slug}`}
                            onClick={() => setOpen(false)}
                            className="block truncate font-serif text-base font-semibold text-parchment-100 transition-colors group-hover:text-gold-200"
                          >
                            {movie.title}
                          </Link>
                          <p className="truncate text-xs text-mist-400">
                            {movie.year ?? "—"}
                            {movie.originalTitle ? ` · ${movie.originalTitle}` : ""}
                          </p>
                          <div className="pt-1">
                            <Link
                              href={`/phim/${movie.slug}`}
                              onClick={() => setOpen(false)}
                              className="inline-flex items-center gap-1 rounded-full border border-gold-400/50 bg-gold-500/15 px-2.5 py-0.5 text-xs font-medium text-gold-200 transition-colors hover:bg-gold-500/25"
                            >
                              <Play className="size-3 fill-current" aria-hidden="true" />
                              Xem ngay
                            </Link>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeBookmark(movie.slug)}
                          aria-label={`Bỏ lưu ${movie.title}`}
                          title="Bỏ lưu khỏi Tàng Kinh Các"
                          className="grid size-7 shrink-0 place-items-center rounded-md border border-transparent text-mist-400 transition-colors hover:border-rouge-400/50 hover:bg-rouge-500/15 hover:text-rouge-200"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {bookmarks.length > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-ink-700/80 px-5 py-3.5">
                  <button
                    type="button"
                    onClick={clearBookmarks}
                    className="inline-flex items-center gap-1.5 text-xs text-parchment-300/85 transition-colors hover:text-rouge-200"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Xóa toàn bộ tủ phim
                  </button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                    Đóng
                  </Button>
                </div>
              )}
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
