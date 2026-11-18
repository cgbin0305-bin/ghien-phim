import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getPublicStore } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/movie/post-card";
import { ScheduleWeekTabs } from "@/components/movie/schedule-week-tabs";
import {
  addDays,
  formatTime,
  getDayOfMonth,
  getMonthLabel,
  getTodayKey,
  getWeekStart,
  getWeekdayLabel,
  toZonedDateKey,
} from "@/lib/date";
import type { ScheduleEvent } from "@/lib/types";

export const metadata: Metadata = {
  title: "Lịch chiếu",
  description:
    "Lịch chiếu phim cổ trang trong tuần từ thứ hai đến chủ nhật, theo múi giờ Asia/Ho_Chi_Minh.",
  alternates: { canonical: "/lich-chieu" },
};

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ week?: string }>;
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

export default async function SchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const store = await getPublicStore();

  const today = getTodayKey();
  const currentWeekStart = getWeekStart(today);
  const requested = params.week ?? currentWeekStart;
  const weekStart = getWeekStart(requested);

  const [week, weeklyPosts] = await Promise.all([
    store.getScheduleForWeek(weekStart),
    store.listPosts({ type: "weekly_schedule" }),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const eventsByDay = new Map<string, ScheduleEvent[]>();
  const eventsByDayRecord: Record<string, ScheduleEvent[]> = {};
  const formattedTimes: Record<string, string> = {};
  for (const day of days) {
    eventsByDay.set(day, []);
    eventsByDayRecord[day] = [];
  }
  for (const event of week.events) {
    const key = toZonedDateKey(new Date(event.scheduledAt));
    const bucket = eventsByDay.get(key);
    if (bucket) {
      bucket.push(event);
      eventsByDayRecord[key]?.push(event);
    }
    formattedTimes[event.id] = formatTime(event.scheduledAt);
  }

  const weekdayTabs = days.map((day) => ({
    dayKey: day,
    weekdayLabel: getWeekdayLabel(day),
    dayOfMonth: String(getDayOfMonth(day)),
    monthLabel: String(getMonthLabel(day)),
    isToday: day === today,
  }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-parchment-100 sm:text-4xl">
            Lịch chiếu
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-parchment-300/85">
            Lịch phát sóng theo tuần, từ thứ hai đến chủ nhật. Mọi giờ hiển thị theo múi giờ{" "}
            <span className="text-gold-200/85">Asia/Ho_Chi_Minh</span>.
          </p>
        </div>

        <nav aria-label="Điều hướng tuần" className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/lich-chieu?week=${prevWeek}`}>
              <ChevronLeft aria-hidden="true" />
              Tuần trước
            </Link>
          </Button>
          <Button
            asChild
            variant={weekStart === currentWeekStart ? "default" : "secondary"}
            size="sm"
          >
            <Link href="/lich-chieu">Tuần này</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/lich-chieu?week=${nextWeek}`}>
              Tuần sau
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </header>

      <p className="mt-6 border-b border-ink-700/70 pb-3 text-sm text-parchment-300/85">
        Tuần {getDayOfMonth(weekStart)}/{getMonthLabel(weekStart)} —{" "}
        {getDayOfMonth(addDays(weekStart, 6))}/{getMonthLabel(addDays(weekStart, 6))}
      </p>

      <ScheduleWeekTabs
        days={weekdayTabs}
        eventsByDayRecord={eventsByDayRecord}
        formattedTimes={formattedTimes}
      />

      {/* Desktop: week grid */}
      <div className="mt-6 hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => {
          const events = eventsByDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <section
              key={day}
              aria-label={`${getWeekdayLabel(day)} ${getDayOfMonth(day)}/${getMonthLabel(day)}`}
              className={`rounded-md border p-3 ${
                isToday ? "border-gold-500/45 bg-gold-500/[0.06]" : "border-ink-700 bg-ink-850/40"
              }`}
            >
              <header className="mb-3 border-b border-ink-700/60 pb-2">
                <p className="text-xs uppercase tracking-[0.14em] text-mist-500">
                  {getWeekdayLabel(day)}
                </p>
                <p
                  className={`font-serif text-lg leading-tight ${
                    isToday ? "text-gold-200" : "text-parchment-100"
                  }`}
                >
                  {getDayOfMonth(day)}
                  {isToday && (
                    <span className="ml-1.5 align-middle text-xs uppercase tracking-wider text-gold-300">
                      Hôm nay
                    </span>
                  )}
                </p>
              </header>

              {events.length === 0 ? (
                <p className="px-1 py-4 text-xs text-mist-400">Không có lịch</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((event) => (
                    <li key={event.id}>
                      <ScheduleCard event={event} compact />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Mobile: day-by-day list */}
      <div className="mt-6 space-y-5 md:hidden">
        {days.map((day) => {
          const events = eventsByDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <section
              key={day}
              aria-label={`${getWeekdayLabel(day)} ${getDayOfMonth(day)}`}
              className={`rounded-md border p-4 ${
                isToday ? "border-gold-500/45 bg-gold-500/[0.06]" : "border-ink-700 bg-ink-850/40"
              }`}
            >
              <header className="mb-3 flex items-baseline gap-2 border-b border-ink-700/60 pb-2">
                <h2 className="font-serif text-base text-parchment-100">
                  {getWeekdayLabel(day)}
                </h2>
                <span className="text-sm text-mist-500">
                  {getDayOfMonth(day)}/{getMonthLabel(day)}
                </span>
                {isToday && (
                  <span className="ml-auto text-xs uppercase tracking-wider text-gold-300">
                    Hôm nay
                  </span>
                )}
              </header>

              {events.length === 0 ? (
                <p className="py-3 text-xs text-mist-400">Không có lịch chiếu.</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((event) => (
                    <li key={event.id}>
                      <ScheduleCard event={event} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {weeklyPosts.length > 0 && (
        <section aria-labelledby="bai-viet-lich-chieu" className="mt-16 space-y-5">
          <div className="border-b border-ink-700/70 pb-4">
            <h2
              id="bai-viet-lich-chieu"
              className="font-serif text-xl font-semibold text-parchment-100"
            >
              Bài viết lịch chiếu trong tuần
            </h2>
            <p className="mt-1 text-sm text-parchment-300/80">
              Bài viết được quản trị viên xuất bản, độc lập với các sự kiện trong lịch ở trên.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScheduleCard({ event, compact = false }: { event: ScheduleEvent; compact?: boolean }) {
  const href = event.episodeId
    ? `/xem/${event.movie?.slug ?? ""}/${event.episode?.slug ?? ""}`
    : `/phim/${event.movie?.slug ?? ""}`;

  return (
    <Link
      href={href}
      className="group flex gap-2.5 rounded-md border border-ink-700 bg-ink-850/70 p-2 transition-colors hover:border-gold-500/40"
    >
      {!compact && event.movie?.posterUrl && (
        <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded border border-ink-700">
          <SafeImage src={event.movie.posterUrl} alt="" fill sizes="80px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-parchment-100 group-hover:text-gold-200">
          {event.movie?.title ?? "Phim"}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-parchment-300/85">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          Tập {event.episodeNumber ?? "?"} · {formatTime(event.scheduledAt)}
        </p>
        <Badge variant={STATUS_VARIANTS[event.status]} className="mt-1.5">
          {STATUS_LABELS[event.status]}
        </Badge>
        {event.note && !compact && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-mist-500">
            {event.note}
          </p>
        )}
      </div>
    </Link>
  );
}