"use client";

import * as React from "react";

export const BOOKMARK_STORAGE_KEY = "gheienphim.tang-kinh-cac";
const BOOKMARK_EVENT = "gheienphim:bookmarks-change";

export interface BookmarkedMovie {
  movieId: string;
  slug: string;
  title: string;
  originalTitle: string | null;
  posterUrl: string | null;
  year: number | null;
  publishedEpisodeCount?: number;
  savedAt: number;
}

export interface BookmarkInput {
  movieId: string;
  slug: string;
  title: string;
  originalTitle?: string | null;
  posterUrl?: string | null;
  year?: number | null;
  publishedEpisodeCount?: number;
}

export function readBookmarksFromStorage(): BookmarkedMovie[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BookmarkedMovie[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.slug === "string" && typeof item.title === "string")
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function notifyBookmarkChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BOOKMARK_EVENT));
}

export function toggleBookmarkInStorage(input: BookmarkInput): {
  saved: boolean;
  bookmarks: BookmarkedMovie[];
} {
  if (typeof window === "undefined") return { saved: false, bookmarks: [] };
  try {
    const current = readBookmarksFromStorage();
    const exists = current.some(
      (b) => b.slug === input.slug || b.movieId === input.movieId,
    );

    let next: BookmarkedMovie[];
    if (exists) {
      next = current.filter(
        (b) => !(b.slug === input.slug || b.movieId === input.movieId),
      );
    } else {
      const added: BookmarkedMovie = {
        movieId: input.movieId,
        slug: input.slug,
        title: input.title,
        originalTitle: input.originalTitle ?? null,
        posterUrl: input.posterUrl ?? null,
        year: input.year ?? null,
        publishedEpisodeCount: input.publishedEpisodeCount,
        savedAt: Date.now(),
      };
      next = [added, ...current];
    }

    if (next.length === 0) {
      window.localStorage.removeItem(BOOKMARK_STORAGE_KEY);
    } else {
      window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(next));
    }
    notifyBookmarkChange();
    return { saved: !exists, bookmarks: next };
  } catch {
    return { saved: false, bookmarks: [] };
  }
}

export function removeBookmarkFromStorage(slugOrId: string): BookmarkedMovie[] {
  if (typeof window === "undefined") return [];
  try {
    const current = readBookmarksFromStorage();
    const next = current.filter(
      (b) => !(b.slug === slugOrId || b.movieId === slugOrId),
    );
    if (next.length === 0) {
      window.localStorage.removeItem(BOOKMARK_STORAGE_KEY);
    } else {
      window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(next));
    }
    notifyBookmarkChange();
    return next;
  } catch {
    return [];
  }
}

export function clearAllBookmarksInStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BOOKMARK_STORAGE_KEY);
    notifyBookmarkChange();
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Custom hook quản lý Tủ Phim Cá Nhân — "Tàng Kinh Các" (`localStorage`, 0ms Optimistic UI).
 */
export function useBookmark() {
  const [bookmarks, setBookmarks] = React.useState<BookmarkedMovie[]>([]);
  const [ready, setReady] = React.useState(false);

  const sync = React.useCallback(() => {
    setBookmarks(readBookmarksFromStorage());
  }, []);

  React.useEffect(() => {
    sync();
    setReady(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === BOOKMARK_STORAGE_KEY || e.key === null) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(BOOKMARK_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(BOOKMARK_EVENT, sync);
    };
  }, [sync]);

  const isBookmarked = React.useCallback(
    (slugOrId: string) =>
      bookmarks.some((b) => b.slug === slugOrId || b.movieId === slugOrId),
    [bookmarks],
  );

  const toggleBookmark = React.useCallback((input: BookmarkInput) => {
    const res = toggleBookmarkInStorage(input);
    setBookmarks(res.bookmarks);
    return res.saved;
  }, []);

  const removeBookmark = React.useCallback((slugOrId: string) => {
    const next = removeBookmarkFromStorage(slugOrId);
    setBookmarks(next);
  }, []);

  const clearBookmarks = React.useCallback(() => {
    clearAllBookmarksInStorage();
    setBookmarks([]);
  }, []);

  return {
    bookmarks,
    count: bookmarks.length,
    ready,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
  };
}
