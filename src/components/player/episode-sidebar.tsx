import Link from "next/link";
import { ListVideo } from "lucide-react";
import { getEpisodeBadgeNumber, sortEpisodes } from "@/lib/episode-sort";
import type { Episode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EpisodeSidebarProps {
  movieSlug: string;
  movieTitle: string;
  episodes: Episode[];
  currentEpisodeId: string;
}

/**
 * Episode list for the watch page. Rendered on the side on desktop and below
 * the player on smaller screens.
 */
export function EpisodeSidebar({
  movieSlug,
  movieTitle,
  episodes,
  currentEpisodeId,
}: EpisodeSidebarProps) {
  if (episodes.length === 0) return null;

  const sortedEpisodes = sortEpisodes(episodes);

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

      <ul className="max-h-[420px] overflow-y-auto p-2 lg:max-h-[calc(100vh-12rem)]">
        {sortedEpisodes.map((episode, index) => {
          const isCurrent = episode.id === currentEpisodeId;
          const badgeNum = getEpisodeBadgeNumber(episode, index);
          return (
            <li key={episode.id}>
              <Link
                href={`/xem/${movieSlug}/${episode.slug}`}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isCurrent
                    ? "bg-gold-500/12 text-gold-200"
                    : "text-parchment-300/80 hover:bg-ink-800 hover:text-parchment-100",
                )}
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
                {episode.releaseDate && (
                  <span className="shrink-0 text-xs text-mist-500">
                    {episode.releaseDate.slice(5)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}