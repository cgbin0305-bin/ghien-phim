import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { ScheduleEvent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { formatTime, toZonedDateKey, getTodayKey } from "@/lib/date";

const STATUS_LABELS: Record<ScheduleEvent["status"], string> = {
  scheduled: "Dự kiến",
  aired: "Đã lên sóng",
  postponed: "Hoãn",
};

const STATUS_VARIANTS: Record<ScheduleEvent["status"], "gold" | "jade" | "rouge"> = {
  scheduled: "gold",
  aired: "jade",
  postponed: "rouge",
};

/**
 * Horizontal strip of the schedule. Shows the next events starting from today
 * (site timezone) and falls back to the earliest events of the week.
 */
export function ScheduleStrip({ events }: { events: ScheduleEvent[] }) {
  const today = getTodayKey();

  const todayEvents = events.filter((e) => toZonedDateKey(new Date(e.scheduledAt)) === today);
  const fallback = events.filter((e) => toZonedDateKey(new Date(e.scheduledAt)) > today);
  const shown = (todayEvents.length > 0 ? todayEvents : fallback).slice(0, 6);

  if (shown.length === 0) {
    return (
      <p className="panel px-5 py-8 text-center text-sm text-parchment-300/80">
        Chưa có lịch chiếu cho tuần này.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((event) => {
        const isLiveOrAired = event.status === "aired";
        return (
          <li key={event.id}>
            <Link
              href={
                event.episodeId
                  ? `/xem/${event.movie?.slug ?? ""}/${event.episode?.slug ?? ""}`
                  : `/phim/${event.movie?.slug ?? ""}`
              }
              className={`group flex h-full items-center gap-3.5 rounded-xl border p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
                isLiveOrAired
                  ? "border-gold-400/45 bg-ink-800/95 shadow-[0_0_24px_-8px_rgba(244,184,96,0.22)] hover:border-gold-300/70"
                  : "border-ink-700 bg-ink-800/70 hover:border-gold-400/40 hover:bg-ink-800"
              }`}
            >
              <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-ink-700 bg-ink-850">
                {event.movie?.posterUrl && (
                  <SafeImage src={event.movie.posterUrl} alt="" fill sizes="96px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-base font-semibold text-parchment-100 transition-colors group-hover:text-gold-300">
                  {event.movie?.title ?? "Phim"}
                </p>
                <p className="mt-0.5 text-xs font-medium tabular-nums text-mist-300">
                  Tập {event.episodeNumber ?? "?"} · {formatTime(event.scheduledAt)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[event.status]}>
                    {STATUS_LABELS[event.status]}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs tabular-nums text-mist-400">
                    <CalendarClock className="size-3" aria-hidden="true" />
                    {toZonedDateKey(new Date(event.scheduledAt))}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
