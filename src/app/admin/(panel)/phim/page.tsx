import Link from "next/link";
import { Plus } from "lucide-react";
import { getStore } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { AdminMovieTable } from "@/components/admin/admin-movie-table";
import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quản lý phim" };

const RELEASE_LABELS: Record<string, string> = {
  upcoming: "Sắp chiếu",
  airing: "Đang chiếu",
  completed: "Hoàn thành",
};

export default async function AdminMoviesPage() {
  const store = await getStore();
  const movies = await store.listAllMoviesForAdmin();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
            Quản lý phim
          </h1>
          <p className="mt-1.5 text-sm text-parchment-300/85">
            {movies.length} phim trong hệ thống · {movies.filter((m) => m.status === "published").length}{" "}
            đã xuất bản
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/phim/new">
            <Plus aria-hidden="true" />
            Thêm phim
          </Link>
        </Button>
      </header>

      {isDemoMode && (
        <p className="rounded-md border border-gold-500/35 bg-gold-500/[0.07] px-4 py-3 text-xs leading-relaxed text-parchment-300/75">
          Chế độ demo: dữ liệu dưới đây là dữ liệu minh hoạ trong bộ nhớ. Các thao tác lưu, xoá và
          xuất bản sẽ không được ghi vào cơ sở dữ liệu.
        </p>
      )}

      <AdminMovieTable movies={movies} releaseLabels={RELEASE_LABELS} />
    </div>
  );
}
