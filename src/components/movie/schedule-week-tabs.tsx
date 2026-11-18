"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import type { ScheduleEvent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

export interface WeekdayTabItem {
  dayKey: string;
  weekdayLabel: string;
  dayOfMonth: string;
  monthLabel: string;
  isToday: boolean;
}

interface ScheduleWeekTabsProps {
  days: WeekdayTabItem[];
  /** Gom nhóm sẵn theo thứ trong bộ nhớ (`Record<WeekdayKey, ScheduleEvent[]>`) để chuyển tab 0ms */
  eventsByDayRecord: Record<string, ScheduleEvent[]>;
  formattedTimes: Record<string, string>;
}

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

export function ScheduleWeekTabs({
  days,
  eventsByDayRecord,
  formattedTimes,
}: ScheduleWeekTabsProps) {
  const defaultDay = React.useMemo(
    () => days.find((d) => d.isToday)?.dayKey ?? "all",
    [days],
  );
  const [selectedDay, setSelectedDay] = React.useState<string>(defaultDay);

  React.useEffect(() => {
    setSelectedDay(days.find((d) => d.isToday)?.dayKey ?? "all");
  }, [days]);

  const activeDayItem = days.find((d) => d.dayKey === selectedDay);
  const activeEvents =
    selectedDay === "all" ? [] : (eventsByDayRecord[selectedDay] ?? []);

  return (
    <div className="mt-6 space-y-6">
      {/* Thanh tab chọn ngày (Thứ 2 -> Chủ Nhật) dạng Sliding Pill mượt mà */}
      <div
        role="tablist"
        aria-label="Chọn ngày trong tuần"
        className="flex items-center gap-2 overflow-x-auto rounded-xl border border-ink-700/80 bg-ink-900/75 p-2 no-scrollbar backdrop-blur-md"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedDay === "all"}
          onClick={() => setSelectedDay("all")}
          className={cn(
            "shrink-0 rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-200",
            selectedDay === "all"
              ? "border border-gold-400/60 bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 font-semibold shadow-[0_2px_14px_-2px_rgba(212,175,55,0.5)]"
              : "border border-transparent text-parchment-300/85 hover:bg-ink-850 hover:text-parchment-100",
          )}
        >
          Cả tuần
        </button>

        {days.map((day) => {
          const isSelected = selectedDay === day.dayKey;
          const count = (eventsByDayRecord[day.dayKey] ?? []).length;
          return (
            <button
              key={day.dayKey}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedDay(day.dayKey)}
              className={cn(
                "group relative flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-left transition-all duration-200",
                isSelected
                  ? "border border-gold-400/60 bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 shadow-[0_2px_14px_-2px_rgba(212,175,55,0.5)]"
                  : day.isToday
                    ? "border border-gold-500/40 bg-gold-500/10 text-gold-200 hover:bg-gold-500/15"
                    : "border border-transparent text-parchment-300/85 hover:bg-ink-850 hover:text-parchment-100",
              )}
            >
              <div>
                <span
                  className={cn(
                    "block text-xs font-semibold",
                    isSelected ? "text-ink-950" : day.isToday ? "text-gold-200" : "text-parchment-100",
                  )}
                >
                  {day.weekdayLabel}
                </span>
                <span
                  className={cn(
                    "block text-xs tabular-nums",
                    isSelected ? "text-ink-900" : "text-mist-400",
                  )}
                >
                  {day.dayOfMonth}/{day.monthLabel}
                </span>
              </div>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                    isSelected
                      ? "bg-ink-950/20 text-ink-950"
                      : "bg-ink-800 text-gold-300",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Khi chọn 1 thứ cụ thể: hiển thị tức thì (0ms) từ bộ nhớ */}
      {selectedDay !== "all" && activeDayItem && (
        <section
          aria-label={`Lịch chiếu ${activeDayItem.weekdayLabel} ${activeDayItem.dayOfMonth}/${activeDayItem.monthLabel}`}
          className="panel oriental-frame animate-fade-in p-5"
        >
          <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-700/70 pb-3">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-serif text-xl font-semibold text-parchment-100">
                {activeDayItem.weekdayLabel} · {activeDayItem.dayOfMonth}/{activeDayItem.monthLabel}
              </h2>
              {activeDayItem.isToday && (
                <Badge variant="gold">Hôm nay</Badge>
              )}
            </div>
            <span className="text-xs text-mist-400">
              {activeEvents.length} lịch phát sóng
            </span>
          </header>

          {activeEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-parchment-300/80">
              Không có lịch chiếu trong ngày này.
            </p>
          ) : (
            <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {activeEvents.map((event) => {
                const href = event.episodeId
                  ? `/xem/${event.movie?.slug ?? ""}/${event.episode?.slug ?? ""}`
                  : `/phim/${event.movie?.slug ?? ""}`;
                return (
                  <li key={event.id}>
                    <PrefetchLink
                      href={href}
                      className="card-cinematic group flex h-full gap-3.5 rounded-xl border border-ink-700 bg-ink-850/75 p-3.5 hover:bg-ink-800"
                    >
                      {event.movie?.posterUrl && (
                        <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md border border-ink-700 bg-ink-900">
                          <SafeImage
                            src={event.movie.posterUrl}
                            alt=""
                            fill
                            sizes="96px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-base font-semibold text-parchment-100 transition-colors group-hover:text-gold-200">
                          {event.movie?.title ?? "Phim"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gold-200/90">
                          <Clock className="size-3 shrink-0 text-gold-300" aria-hidden="true" />
                          Tập {event.episodeNumber ?? "?"} · {formattedTimes[event.id] ?? ""}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={STATUS_VARIANTS[event.status]}>
                            {STATUS_LABELS[event.status]}
                          </Badge>
                        </div>
                      </div>
                    </PrefetchLink>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
