"use client";

import * as React from "react";

export const WATCH_HISTORY_STORAGE_KEY = "gheienphim.continue-watching";
const WATCH_HISTORY_EVENT = "gheienphim:watch-history-change";
const MAX_HISTORY_ITEMS = 12;

export interface WatchHistoryRecord {
  movieId: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  episodeName: string;
  episodeSlug: string;
  updatedAt: number;
  // Các trường tương thích ngược cho bộ test và component cũ
  movieSlug: string;
  movieTitle: string;
  episodeTitle: string;
  visitedAt: number;
}

export interface SaveWatchHistoryInput {
  movieId?: string;
  title?: string;
  slug?: string;
  thumbnailUrl?: string | null;
  episodeName?: string;
  episodeSlug: string;
  // Tương thích ngược với recordWatchEntry({ movieSlug, episodeSlug, movieTitle, episodeTitle })
  movieSlug?: string;
  movieTitle?: string;
  episodeTitle?: string;
}

function normalizeRecord(raw: unknown): WatchHistoryRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const slug =
    typeof obj.slug === "string" && obj.slug
      ? obj.slug
      : typeof obj.movieSlug === "string"
        ? obj.movieSlug
        : "";
  const episodeSlug = typeof obj.episodeSlug === "string" ? obj.episodeSlug : "";
  if (!slug || !episodeSlug) return null;

  const title =
    typeof obj.title === "string" && obj.title
      ? obj.title
      : typeof obj.movieTitle === "string"
        ? obj.movieTitle
        : slug;
  const episodeName =
    typeof obj.episodeName === "string" && obj.episodeName
      ? obj.episodeName
      : typeof obj.episodeTitle === "string"
        ? obj.episodeTitle
        : episodeSlug;
  const updatedAt =
    typeof obj.updatedAt === "number"
      ? obj.updatedAt
      : typeof obj.visitedAt === "number"
        ? obj.visitedAt
        : Date.now();
  const movieId =
    typeof obj.movieId === "string" && obj.movieId ? obj.movieId : slug;
  const thumbnailUrl =
    typeof obj.thumbnailUrl === "string" && obj.thumbnailUrl ? obj.thumbnailUrl : null;

  return {
    movieId,
    title,
    slug,
    thumbnailUrl,
    episodeName,
    episodeSlug,
    updatedAt,
    movieSlug: slug,
    movieTitle: title,
    episodeTitle: episodeName,
    visitedAt: updatedAt,
  };
}

export function readWatchHistoryFromStorage(): WatchHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRecord)
      .filter((item): item is WatchHistoryRecord => item !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

function notifyHistoryChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WATCH_HISTORY_EVENT));
}

export function saveWatchHistoryEntry(input: SaveWatchHistoryInput): WatchHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const slug = (input.slug ?? input.movieSlug ?? "").trim();
    const episodeSlug = input.episodeSlug.trim();
    if (!slug || !episodeSlug) return readWatchHistoryFromStorage();

    const title = (input.title ?? input.movieTitle ?? slug).trim();
    const episodeName = (input.episodeName ?? input.episodeTitle ?? episodeSlug).trim();
    const now = Date.now();

    const newRecord: WatchHistoryRecord = {
      movieId: (input.movieId ?? slug).trim(),
      title,
      slug,
      thumbnailUrl: input.thumbnailUrl ?? null,
      episodeName,
      episodeSlug,
      updatedAt: now,
      movieSlug: slug,
      movieTitle: title,
      episodeTitle: episodeName,
      visitedAt: now,
    };

    const current = readWatchHistoryFromStorage();
    // Gộp theo từng bộ phim (slug) để kệ "Xem Tiếp" luôn hiện tập mới nhất đang xem của bộ phim đó
    const next = [
      newRecord,
      ...current.filter((item) => item.slug !== slug),
    ].slice(0, MAX_HISTORY_ITEMS);

    window.localStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
    notifyHistoryChange();
    return next;
  } catch {
    return [];
  }
}

export function removeWatchHistoryEntry(
  movieSlugOrId: string,
  episodeSlug?: string,
): WatchHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const current = readWatchHistoryFromStorage();
    const next = current.filter((item) => {
      const matchMovie = item.slug === movieSlugOrId || item.movieId === movieSlugOrId;
      if (!matchMovie) return true;
      if (episodeSlug) return item.episodeSlug !== episodeSlug;
      return false;
    });

    if (next.length === 0) {
      window.localStorage.removeItem(WATCH_HISTORY_STORAGE_KEY);
    } else {
      window.localStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
    }
    notifyHistoryChange();
    return next;
  } catch {
    return [];
  }
}

export function clearAllWatchHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WATCH_HISTORY_STORAGE_KEY);
    notifyHistoryChange();
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Custom hook quản lý lịch sử xem phim bằng `localStorage` (Type-safe, tối đa 12 phim gần nhất).
 */
export function useWatchHistory() {
  const [history, setHistory] = React.useState<WatchHistoryRecord[]>([]);
  const [ready, setReady] = React.useState(false);

  const sync = React.useCallback(() => {
    setHistory(readWatchHistoryFromStorage());
  }, []);

  React.useEffect(() => {
    sync();
    setReady(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === WATCH_HISTORY_STORAGE_KEY || e.key === null) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(WATCH_HISTORY_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WATCH_HISTORY_EVENT, sync);
    };
  }, [sync]);

  const recordEpisode = React.useCallback((input: SaveWatchHistoryInput) => {
    const next = saveWatchHistoryEntry(input);
    setHistory(next);
  }, []);

  const removeItem = React.useCallback((movieSlugOrId: string, episodeSlug?: string) => {
    const next = removeWatchHistoryEntry(movieSlugOrId, episodeSlug);
    setHistory(next);
  }, []);

  const clearHistory = React.useCallback(() => {
    clearAllWatchHistory();
    setHistory([]);
  }, []);

  return {
    history,
    ready,
    recordEpisode,
    removeItem,
    clearHistory,
  };
}
