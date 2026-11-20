"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Layers, ListVideo, Play } from "lucide-react";
import { getEpisodeBadgeNumber, sortEpisodes } from "@/lib/episode-sort";
import { getEpisodeParts } from "@/lib/episode-parts";
import type { Episode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EpisodeSidebarProps {
  movieSlug: string;
  movieTitle: string;
  episodes: Episode[];
  currentEpisodeId: string;
  currentPartIndex?: number;
}

/**
 * Episode list for the watch page. Rendered on the side on desktop and below
 * the player on smaller screens. Episodes with multiple parts expose an inline
 * dropdown toggle so viewers immediately notice and jump to any part.
 */
export function EpisodeSidebar({
  movieSlug,
  movieTitle,
  episodes,
  currentEpisodeId,
  currentPartIndex = 0,
}: EpisodeSidebarProps) {
  const sortedEpisodes = React.useMemo(() => sortEpisodes(episodes), [episodes]);

  // Mặc định mở sẵn dropdown nếu tập đang xem có nhiều phần
  const [expandedEpisodeId, setExpandedEpisodeId] = React.useState<string | null>(() => {
    const current = episodes.find((e) => e.id === currentEpisodeId);
    if (current && getEpisodeParts(current.sources).length > 1) {
      return current.id;
    }
    return null;
  });

  if (episodes.length === 0) return null;

  return (
    <aside
      aria-label={`Danh sách tập ${movieTitle}`}
      className="panel h-fit overflow-hidden lg:sticky lg:top-20"
    >
      <div className="flex items-center gap-2 border-b border-ink-700/70 px-4 py-3">
        <ListVideo className="size-4 shrink-0 text-gold-300" aria-hidden="true" />
        <h2 className="font-serif text-sm font-semibold text-parchment-100">
          Danh sách tập
        </h2>
        <span className="ml-auto text-xs text-mist-500">{sortedEpisodes.length} tập</span>
      </div>

      <ul className="max-h-[420px] space-y-1 overflow-y-auto p-2 lg:max-h-[calc(100vh-12rem)]">
        {sortedEpisodes.map((episode, index) => {
          const isCurrent = episode.id === currentEpisodeId;
          const badgeNum = getEpisodeBadgeNumber(episode, index);
          const parts = getEpisodeParts(episode.sources);
          const hasMultipleParts = parts.length > 1;
          const isExpanded = expandedEpisodeId === episode.id;

          return (
            <li key={episode.id}>
              <div
                className={cn(
                  "flex items-stretch overflow-hidden rounded-md transition-colors",
                  isCurrent
                    ? "bg-gold-500/12 text-gold-200"
                    : "text-parchment-300/80 hover:bg-ink-800 hover:text-parchment-100",
                )}
              >
                <Link
                  href={`/xem/${movieSlug}/${episode.slug}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-sm"
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded border text-xs tabular-nums",
                      isCurrent
                        ? "border-gold-500/50 bg-gold-500/15 text-gold-200"
                        : "border-ink-700 text-parchment-300/85",
                    )}
                  >
                    {badgeNum}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{episode.title}</span>
                  {!hasMultipleParts && episode.releaseDate && (
                    <span className="shrink-0 text-xs text-mist-500">
                      {episode.releaseDate.slice(5)}
                    </span>
                  )}
                </Link>

                {hasMultipleParts && (
                  <button
                    type="button"
                    onClick={() => setExpandedEpisodeId(isExpanded ? null : episode.id)}
                    aria-expanded={isExpanded}
                    aria-label={`Xem các phần của ${episode.title}`}
                    className={cn(
                      "flex shrink-0 items-center gap-1 border-l border-ink-700/60 px-2.5 text-xs font-semibold transition-colors",
                      isExpanded
                        ? "bg-gold-500/20 text-gold-200"
                        : "text-gold-300 hover:bg-gold-500/15 hover:text-gold-200",
                    )}
                  >
                    <Layers className="size-3" aria-hidden="true" />
                    <span>{parts.length} phần</span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>

              {hasMultipleParts && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-gold-500/35 pl-2.5 pb-1">
                  {parts.map((part) => {
                    const isPartActive = isCurrent && part.index === currentPartIndex;
                    return (
                      <Link
                        key={part.index}
                        href={`/xem/${movieSlug}/${episode.slug}?phan=${part.index + 1}`}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                          isPartActive
                            ? "bg-gold-500/20 text-gold-200"
                            : "text-parchment-200 hover:bg-ink-850 hover:text-gold-200",
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Play className="size-3 shrink-0 text-gold-300" aria-hidden="true" />
                          <span className="truncate">{part.label}</span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-mist-400">
                          {part.provider === "youtube" ? "YT" : "FB"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
