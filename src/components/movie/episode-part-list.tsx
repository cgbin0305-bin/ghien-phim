"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Layers, Play } from "lucide-react";
import { getEpisodeBadgeNumber } from "@/lib/episode-sort";
import { getEpisodeParts } from "@/lib/episode-parts";
import type { Episode } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatEpisodeLabel(episode: Episode): string {
  const trimmed = episode.title.trim();
  if (!trimmed || /^\d+$/.test(trimmed)) {
    return `Tập ${episode.episodeNumber}`;
  }
  return trimmed;
}

export function EpisodeListGrid({
  movieSlug,
  movieTitle,
  episodes,
}: {
  movieSlug: string;
  movieTitle: string;
  episodes: Episode[];
}) {
  const [openEpisodeId, setOpenEpisodeId] = React.useState<string | null>(null);

  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {episodes.map((episode, index) => {
        const label = formatEpisodeLabel(episode);
        const badgeNum = getEpisodeBadgeNumber(episode, index);
        const parts = getEpisodeParts(episode.sources);
        const hasMultipleParts = parts.length > 1;
        const isOpen = openEpisodeId === episode.id;

        return (
          <li key={episode.id} className="relative">
            <div className="card-cinematic shine-effect group flex min-h-12 items-stretch overflow-hidden rounded-lg border border-ink-700 bg-ink-850/75 transition-colors hover:border-gold-500/45 hover:bg-ink-800">
              <Link
                href={`/xem/${movieSlug}/${episode.slug}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-2.5 px-3.5 py-2.5 text-sm font-medium text-parchment-100 hover:text-gold-200"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded border border-ink-700 bg-ink-900 text-xs tabular-nums text-gold-300 transition-colors group-hover:border-gold-500/50 group-hover:bg-gold-500/15">
                    {badgeNum}
                  </span>
                  <span className="truncate">{label}</span>
                </span>

                {!hasMultipleParts && (
                  <Play
                    className="size-3.5 shrink-0 text-gold-300 opacity-70 transition-transform duration-200 group-hover:scale-110 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                )}

                <span className="sr-only">
                  {label} của {movieTitle}
                </span>
              </Link>

              {hasMultipleParts && (
                <button
                  type="button"
                  onClick={() => setOpenEpisodeId(isOpen ? null : episode.id)}
                  aria-expanded={isOpen}
                  aria-label={`Chọn phần cho ${label}`}
                  className={cn(
                    "flex shrink-0 items-center gap-1 border-l border-ink-700/80 px-2.5 text-xs font-semibold transition-colors",
                    isOpen
                      ? "bg-gold-500/20 text-gold-200"
                      : "bg-gold-500/10 text-gold-300 hover:bg-gold-500/20 hover:text-gold-200",
                  )}
                >
                  <Layers className="size-3.5" aria-hidden="true" />
                  <span>{parts.length} phần</span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>

            {hasMultipleParts && isOpen && (
              <div className="mt-1.5 rounded-lg border border-gold-500/40 bg-ink-900/95 p-1.5 shadow-xl">
                <p className="px-2 py-1 text-xs font-medium text-mist-400">
                  Chọn phần của {label}:
                </p>
                <div className="grid gap-1">
                  {parts.map((part) => (
                    <Link
                      key={part.index}
                      href={`/xem/${movieSlug}/${episode.slug}?phan=${part.index + 1}`}
                      onClick={() => setOpenEpisodeId(null)}
                      className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-parchment-100 transition-colors hover:bg-gold-500/15 hover:text-gold-200"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Play className="size-3 shrink-0 text-gold-300" aria-hidden="true" />
                        <span className="truncate">{part.label}</span>
                      </span>
                      <span className="shrink-0 rounded border border-ink-700 bg-ink-950 px-1.5 py-0.5 font-mono text-xs text-mist-400">
                        {part.provider === "youtube" ? "YT" : "FB"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
