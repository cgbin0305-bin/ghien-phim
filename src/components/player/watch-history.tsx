"use client";

import * as React from "react";
import { History, RotateCcw, Trash2, X } from "lucide-react";
import {
  clearWatchHistory,
  recordWatchEntry,
  removeWatchEntry,
} from "@/components/movie/continue-watching";
import { incrementMovieViewAction } from "@/app/actions/community";

interface WatchHistoryProps {
  movieId?: string;
  movieSlug: string;
  movieTitle: string;
  thumbnailUrl?: string | null;
  episodeSlug: string;
  episodeTitle: string;
}

/**
 * Tự động ghi nhớ tập đang xem vào `useWatchHistory` (localStorage) và
 * tự động cộng +1 lượt xem thông minh (kiểm tra `sessionStorage` để mỗi phiên
 * truy cập chỉ tính 1 lượt xem cho mỗi bộ phim, chống spam F5).
 */
export function WatchHistory({
  movieId,
  movieSlug,
  movieTitle,
  thumbnailUrl = null,
  episodeSlug,
  episodeTitle,
}: WatchHistoryProps) {
  const [status, setStatus] = React.useState<"saved" | "removed_current" | "cleared_all">("saved");

  React.useEffect(() => {
    recordWatchEntry({
      movieId: movieId ?? movieSlug,
      slug: movieSlug,
      title: movieTitle,
      thumbnailUrl,
      episodeSlug,
      episodeName: episodeTitle,
    });
    setStatus("saved");
  }, [movieId, movieSlug, movieTitle, thumbnailUrl, episodeSlug, episodeTitle]);

  // Tự động tính lượt xem thông minh (1 lần / phiên truy cập / phim)
  React.useEffect(() => {
    const idOrSlug = movieId ?? movieSlug;
    if (!idOrSlug) return;
    try {
      const sessionKey = `gheienphim.viewed.${idOrSlug}`;
      if (window.sessionStorage.getItem(sessionKey)) return;
      window.sessionStorage.setItem(sessionKey, String(Date.now()));

      // Lưu thêm bộ đếm lượt xem local để Optimistic UI hiển thị ngay lập tức
      const localViewsKey = "gheienphim.local-views";
      const rawLocal = window.localStorage.getItem(localViewsKey);
      const parsedLocal = rawLocal ? (JSON.parse(rawLocal) as Record<string, number>) : {};
      parsedLocal[idOrSlug] = (Number(parsedLocal[idOrSlug]) || 0) + 1;
      window.localStorage.setItem(localViewsKey, JSON.stringify(parsedLocal));
    } catch {
      // Ignore storage failures.
    }

    if (movieId) {
      void incrementMovieViewAction(movieId).catch(() => {
        // Graceful fallback
      });
    }
  }, [movieId, movieSlug]);

  function handleRemoveCurrent() {
    removeWatchEntry(movieSlug, episodeSlug);
    setStatus("removed_current");
  }

  function handleClearAll() {
    clearWatchHistory();
    setStatus("cleared_all");
  }

  function handleRestoreCurrent() {
    recordWatchEntry({
      movieId: movieId ?? movieSlug,
      slug: movieSlug,
      title: movieTitle,
      thumbnailUrl,
      episodeSlug,
      episodeName: episodeTitle,
    });
    setStatus("saved");
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink-700/60 bg-ink-850/45 px-3.5 py-2.5 text-xs">
      <p className="flex items-center gap-2 text-mist-400">
        <History className="size-3.5 shrink-0 text-gold-300" aria-hidden="true" />
        {status === "saved" && (
          <span>
            Đã tự động nhớ <strong className="text-gold-200">{episodeTitle}</strong> vào kệ Tiếp Tục Hành Trình.
          </span>
        )}
        {status === "removed_current" && (
          <span className="text-parchment-200">Đã xóa tập này khỏi kệ Xem Tiếp.</span>
        )}
        {status === "cleared_all" && (
          <span className="text-parchment-200">Đã xóa toàn bộ lịch sử xem trên trình duyệt.</span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {status === "saved" ? (
          <>
            <button
              type="button"
              onClick={handleRemoveCurrent}
              className="inline-flex items-center gap-1 rounded border border-ink-600 bg-ink-850 px-2.5 py-1 text-xs text-parchment-200 transition-colors hover:border-rouge-400/50 hover:bg-rouge-500/15 hover:text-rouge-200"
            >
              <X className="size-3.5" aria-hidden="true" />
              Xóa tập này
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 rounded border border-ink-600 bg-ink-850 px-2.5 py-1 text-xs text-parchment-300/85 transition-colors hover:border-rouge-400/50 hover:bg-rouge-500/15 hover:text-rouge-200"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Xóa toàn bộ lịch sử
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleRestoreCurrent}
            className="inline-flex items-center gap-1 rounded border border-gold-500/40 bg-gold-500/10 px-2.5 py-1 text-xs font-medium text-gold-200 transition-colors hover:bg-gold-500/20"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Lưu lại tập này
          </button>
        )}
      </div>
    </div>
  );
}
