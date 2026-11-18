import { getStore } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { getTodayKey, getWeekStart } from "@/lib/date";
import { ScheduleAdmin } from "@/components/admin/schedule-admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quản lý lịch chiếu" };

export default async function AdminSchedulePage() {
  const store = await getStore();
  const [movies, events] = await Promise.all([
    store.listAllMoviesForAdmin(),
    store.listAllScheduleEvents(),
  ]);

  // Load episodes for every movie so the admin can attach a schedule event to
  // an existing episode (or leave it for a future episode).
  const episodesByMovie: Record<string, Awaited<ReturnType<typeof store.listEpisodes>>> = {};
  for (const movie of movies) {
    episodesByMovie[movie.id] = await store.listEpisodes(movie.id);
  }

  const todayKey = getTodayKey();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
          Quản lý lịch chiếu
        </h1>
        <p className="mt-1.5 text-sm text-parchment-300/85">
          Mọi giờ nhập và hiển thị theo múi giờ Asia/Ho_Chi_Minh (UTC+7).
        </p>
      </header>

      {isDemoMode && (
        <p className="rounded-md border border-gold-500/35 bg-gold-500/[0.07] px-4 py-3 text-xs leading-relaxed text-parchment-300/75">
          Chế độ demo: thao tác lưu lịch sẽ không được ghi vào cơ sở dữ liệu.
        </p>
      )}

      <ScheduleAdmin
        movies={movies}
        episodesByMovie={episodesByMovie}
        events={events}
        todayKey={todayKey}
        currentWeekStart={getWeekStart(todayKey)}
      />
    </div>
  );
}
