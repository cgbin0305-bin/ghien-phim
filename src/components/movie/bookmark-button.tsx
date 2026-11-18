"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { useBookmark, type BookmarkInput } from "@/hooks/useBookmark";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps extends BookmarkInput {
  variant?: "icon" | "pill";
  className?: string;
}

export function BookmarkButton({
  movieId,
  slug,
  title,
  originalTitle = null,
  posterUrl = null,
  year = null,
  publishedEpisodeCount,
  variant = "icon",
  className,
}: BookmarkButtonProps) {
  const { ready, isBookmarked, toggleBookmark } = useBookmark();
  const { toast } = useToast();
  const [justToggled, setJustToggled] = React.useState(false);

  const saved = ready && isBookmarked(slug || movieId);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const nowSaved = toggleBookmark({
      movieId,
      slug,
      title,
      originalTitle,
      posterUrl,
      year,
      publishedEpisodeCount,
    });

    setJustToggled(true);
    window.setTimeout(() => setJustToggled(false), 380);

    toast(
      nowSaved
        ? `Đã thu thập “${title}” vào Tàng Kinh Các.`
        : `Đã gỡ “${title}” khỏi Tàng Kinh Các.`,
      nowSaved ? "success" : "info",
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-125",
          saved
            ? "border-gold-400/75 bg-gradient-to-r from-gold-500/25 via-rouge-500/20 to-gold-500/25 text-gold-200 shadow-[0_0_18px_-3px_rgba(212,175,55,0.55)]"
            : "border-ink-600 bg-ink-850/90 text-parchment-200 hover:border-gold-500/50 hover:text-gold-200",
          justToggled && "scale-110 ring-2 ring-gold-400/60",
          className,
        )}
      >
        <Heart
          className={cn(
            "size-3.5 transition-transform duration-200",
            saved ? "fill-rouge-400 text-rouge-300 scale-110" : "text-gold-300",
          )}
          aria-hidden="true"
        />
        <span>{saved ? "Đã lưu trong Tàng Kinh Các" : "Lưu vào Tàng Kinh Các"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={
        saved
          ? `Bỏ lưu ${title} khỏi Tàng Kinh Các`
          : `Lưu ${title} vào Tàng Kinh Các`
      }
      title={saved ? "Đã lưu trong Tàng Kinh Các (Bấm để bỏ lưu)" : "Lưu vào Tàng Kinh Các"}
      className={cn(
        "grid size-8 place-items-center rounded-full border backdrop-blur-md transition-all duration-200 active:scale-125",
        saved
          ? "border-gold-400/80 bg-ink-950/90 text-rouge-300 shadow-[0_0_16px_rgba(212,175,55,0.65)]"
          : "border-ink-600/80 bg-ink-950/80 text-parchment-200 hover:border-gold-400/60 hover:text-gold-200",
        justToggled && "scale-125 ring-2 ring-gold-400/70",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-transform duration-200",
          saved && "fill-rouge-400 text-rouge-300",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
