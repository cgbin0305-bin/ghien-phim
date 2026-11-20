import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  FilePlus2,
  Film,
  ListVideo,
  CalendarRange,
  ArrowRight,
  Tags,
} from "lucide-react";
import { getStore } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date";
import {
  listBrokenReportsForAdmin,
  resolveBrokenReportAction,
} from "@/app/actions/community";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const store = await getStore();
  const [stats, brokenReports] = await Promise.all([
    store.getDashboardStats(),
    listBrokenReportsForAdmin(),
  ]);

  const cards = [
    { label: "Tổng số phim", value: stats.movieCount, hint: `${stats.publishedMovieCount} đã xuất bản` },
    {
      label: "Tổng số tập",
      value: stats.episodeCount,
      hint: `${stats.publishedEpisodeCount} đã xuất bản`,
    },
    { label: "Số bài viết", value: stats.postCount, hint: "Bài đã tạo" },
    {
      label: "Lịch chiếu sắp tới",
      value: stats.upcomingScheduleCount,
      hint: "Sự kiện đang chờ",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
          Bảng điều khiển
        </h1>
        <p className="mt-1.5 text-sm text-parchment-300/85">
          Tổng quan nội dung của Ghiền Phim.
        </p>
      </header>

      {isDemoMode && (
        <div className="rounded-md border border-gold-500/35 bg-gold-500/[0.07] px-4 py-3">
          <p className="text-sm font-medium text-gold-100">Chế độ demo</p>
          <p className="mt-1 text-xs leading-relaxed text-parchment-300/85">
            Chưa có Supabase được cấu hình. Các số liệu dưới đây đến từ dữ liệu minh hoạ trong bộ
            nhớ và mọi thao tác lưu sẽ không được ghi vào cơ sở dữ liệu.
          </p>
        </div>
      )}

      <section aria-label="Thống kê tổng quan">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-mist-500">{card.label}</p>
              <p className="mt-2 font-serif text-3xl font-semibold tabular-nums text-parchment-100">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-parchment-300/80">{card.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="thao-tac-nhanh">
        <h2 id="thao-tac-nhanh" className="text-xs font-medium uppercase tracking-[0.18em] text-gold-300/80">
          Thao tác nhanh
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <QuickAction href="/admin/phan-tich" icon={BarChart3} label="Phân tích & Link" />
          <QuickAction href="/admin/phim/new" icon={Film} label="Thêm phim" />
          <QuickAction href="/admin/phim" icon={ListVideo} label="Quản lý tập" />
          <QuickAction href="/admin/the-loai" icon={Tags} label="Quản lý thể loại" />
          <QuickAction href="/admin/lich-chieu" icon={CalendarPlus} label="Thêm lịch chiếu" />
          <QuickAction href="/admin/bai-viet/new" icon={FilePlus2} label="Viết bài viết" />
        </div>
      </section>

      <section aria-labelledby="bao-loi-tap-phim" className="panel border-rouge-500/35 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md border border-rouge-400/50 bg-rouge-500/15 text-rouge-300">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="bao-loi-tap-phim"
                className="font-serif text-base font-semibold text-parchment-100"
              >
                Tập phim bị người dùng báo lỗi link ({brokenReports.length})
              </h2>
              <p className="text-xs text-parchment-300/80">
                Danh sách các tập được người xem bấm “Báo lỗi tập phim” trên trình phát để Admin kịp thời thay link dự phòng.
              </p>
            </div>
          </div>
          {brokenReports.length > 0 && (
            <Badge variant="rouge">{brokenReports.length} cần kiểm tra</Badge>
          )}
        </div>

        {brokenReports.length === 0 ? (
          <p className="mt-4 rounded-md border border-ink-700/70 bg-ink-900/50 px-4 py-3 text-xs text-jade-200">
            Hiện tại tất cả các tập phim đều hoạt động ổn định, chưa có báo lỗi link hỏng nào từ người xem.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {brokenReports.map((rep) => (
              <li
                key={rep.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rouge-500/30 bg-rouge-500/[0.06] px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-sm font-semibold text-parchment-100">
                      {rep.movieTitle} · {rep.episodeTitle}
                    </span>
                    {rep.serverLabel && <Badge variant="rouge">{rep.serverLabel}</Badge>}
                  </div>
                  <p className="text-xs text-parchment-300/80">
                    Báo lúc: {formatDateTime(rep.createdAt)}
                    {rep.note ? ` · ${rep.note}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {rep.movieId && (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/admin/phim/${rep.movieId}/episodes`}>
                        Thay link ngay
                      </Link>
                    </Button>
                  )}
                  <form action={resolveBrokenReportAction}>
                    <input type="hidden" name="id" value={rep.id} />
                    <input type="hidden" name="episodeId" value={rep.episodeId} />
                    <Button type="submit" variant="ghost" size="sm" className="text-jade-200 hover:text-jade-100">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Đã xử lý
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="noi-dung-moi" className="panel p-5">
          <h2 id="noi-dung-moi" className="font-serif text-base font-semibold text-parchment-100">
            Nội dung mới cập nhật
          </h2>
          {stats.recentMovies.length === 0 ? (
            <p className="mt-4 text-sm text-parchment-300/80">Chưa có phim nào.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.recentMovies.map((movie) => (
                <li key={movie.id}>
                  <Link
                    href={`/admin/phim/${movie.id}/edit`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-ink-800"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-parchment-100">
                      {movie.title}
                    </span>
                    <Badge
                      variant={movie.status === "published" ? "jade" : "muted"}
                      className="shrink-0"
                    >
                      {movie.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="bai-viet-moi-admin" className="panel p-5">
          <h2
            id="bai-viet-moi-admin"
            className="font-serif text-base font-semibold text-parchment-100"
          >
            Bài viết mới
          </h2>
          {stats.recentPosts.length === 0 ? (
            <p className="mt-4 text-sm text-parchment-300/80">Chưa có bài viết nào.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.recentPosts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/admin/bai-viet/${post.id}/edit`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-ink-800"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-parchment-100">
                      {post.title}
                    </span>
                    <Badge variant={post.status === "published" ? "jade" : "muted"} className="shrink-0">
                      {post.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="lich-sap-toi-admin" className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="lich-sap-toi-admin"
            className="font-serif text-base font-semibold text-parchment-100"
          >
            Lịch chiếu sắp tới
          </h2>
          <Link
            href="/admin/lich-chieu"
            className="link-underline inline-flex items-center gap-1 text-xs uppercase tracking-wider text-gold-300/80"
          >
            Quản lý
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        {stats.upcomingEvents.length === 0 ? (
          <p className="mt-4 text-sm text-parchment-300/80">Chưa có sự kiện sắp tới.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {stats.upcomingEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-2 text-sm"
              >
                <CalendarRange className="size-4 shrink-0 text-gold-300" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-parchment-100">
                  {event.movie?.title ?? "Phim"} · Tập {event.episodeNumber ?? "?"}
                </span>
                <span className="text-xs text-parchment-300/80">
                  {formatDateTime(event.scheduledAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Film;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-md border border-ink-700 bg-ink-850/60 p-4 transition-colors hover:border-gold-500/40 hover:bg-ink-800"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-ink-600 bg-ink-800 text-gold-300 transition-colors group-hover:border-gold-500/40">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-sm text-parchment-100">{label}</span>
      <ArrowRight
        className="ml-auto size-4 shrink-0 text-mist-400 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}