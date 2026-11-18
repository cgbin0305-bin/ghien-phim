"use client";

import Link from "next/link";
import { Compass, PlayCircle, Trash2, X } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import {
  useWatchHistory,
  saveWatchHistoryEntry,
  removeWatchHistoryEntry,
  clearAllWatchHistory,
  readWatchHistoryFromStorage,
  WATCH_HISTORY_STORAGE_KEY,
  type WatchHistoryRecord,
  type SaveWatchHistoryInput,
} from "@/hooks/useWatchHistory";
import type { MovieWithStats } from "@/lib/types";

export { WATCH_HISTORY_STORAGE_KEY };
export type WatchEntry = WatchHistoryRecord;

export function readWatchHistory(): WatchHistoryRecord[] {
  return readWatchHistoryFromStorage();
}

/** Records a visit. Called by the watch page after the player mounts. */
export function recordWatchEntry(entry: SaveWatchHistoryInput) {
  saveWatchHistoryEntry(entry);
}

/** Removes a single episode entry from watch history and returns the updated list. */
export function removeWatchEntry(
  movieSlug: string,
  episodeSlug?: string,
): WatchHistoryRecord[] {
  return removeWatchHistoryEntry(movieSlug, episodeSlug);
}

/** Clears all entries from watch history. */
export function clearWatchHistory() {
  clearAllWatchHistory();
}

/**
 * Kệ phim "Tiếp Tục Hành Trình (Xem Tiếp)" trên Trang Chủ.
 * Chỉ hiển thị khi người dùng có lịch sử xem trong `localStorage` (tối đa 12 phim).
 */
export function ContinueWatching({ movies }: { movies: MovieWithStats[] }) {
  const { history, ready, removeItem, clearHistory } = useWatchHistory();

  if (!ready || history.length === 0) return null;

  return (
    <section aria-labelledby="tiep-tuc-xem" className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-6">
      <div className="panel oriental-frame relative overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-700/75 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full border border-gold-400/50 bg-gold-500/15 text-gold-300">
                <Compass className="size-4" aria-hidden="true" />
              </span>
              <h2
                id="tiep-tuc-xem"
                className="font-serif text-xl font-bold text-parchment-100 sm:text-2xl"
              >
                Tiếp Tục Hành Trình (Xem Tiếp)
              </h2>
            </div>
            <p className="text-xs text-parchment-300/85 sm:text-sm">
              Tiếp tục xem các bộ phim đạo hữu đang theo dõi dở trên trình duyệt này.
            </p>
          </div>

          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-850/90 px-3 py-1.5 text-xs font-medium text-parchment-200 transition-colors hover:border-rouge-400/60 hover:bg-rouge-500/15 hover:text-rouge-200"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Xóa tất cả lịch sử
          </button>
        </div>

        <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {history.slice(0, 12).map((entry) => {
            const movie = movies.find(
              (m) => m.slug === entry.slug || m.id === entry.movieId,
            );
            const thumb = entry.thumbnailUrl || movie?.posterUrl || movie?.backdropUrl || null;

            return (
              <li
                key={`${entry.slug}-${entry.episodeSlug}`}
                className="group relative flex items-center overflow-hidden rounded-lg border border-ink-700 bg-ink-850/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-400/55 hover:bg-ink-800 hover:shadow-[0_10px_28px_-12px_rgba(212,175,55,0.3)]"
              >
                <Link
                  href={`/xem/${entry.slug}/${entry.episodeSlug}`}
                  className="flex min-w-0 flex-1 items-center gap-3 p-3 pr-10"
                >
                  <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md border border-ink-600 bg-ink-900">
                    {thumb ? (
                      <SafeImage
                        src={thumb}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-ink-900 text-gold-300">
                        <PlayCircle className="size-5" aria-hidden="true" />
                      </div>
                    )}
                    <div className="absolute inset-0 grid place-items-center bg-ink-950/35 opacity-0 transition-opacity group-hover:opacity-100">
                      <PlayCircle className="size-6 text-gold-200 drop-shadow" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="block truncate font-serif text-base font-semibold text-parchment-100 transition-colors group-hover:text-gold-200">
                      {entry.title}
                    </span>

                    {/* Nhãn ánh kim báo rõ tập đang xem dở */}
                    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-gold-400/55 bg-gradient-to-r from-gold-500/20 via-gold-400/15 to-gold-500/20 px-2.5 py-0.5 text-xs font-medium text-gold-200 shadow-[0_0_12px_-3px_rgba(212,175,55,0.45)]">
                      <PlayCircle className="size-3 shrink-0 text-gold-300" aria-hidden="true" />
                      <span className="truncate">Đang xem: {entry.episodeName}</span>
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => removeItem(entry.slug, entry.episodeSlug)}
                  aria-label={`Xóa ${entry.title} - ${entry.episodeName} khỏi lịch sử xem`}
                  title="Xóa khỏi lịch sử xem"
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-md border border-transparent text-mist-400 transition-colors hover:border-rouge-400/50 hover:bg-rouge-500/15 hover:text-rouge-200"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
