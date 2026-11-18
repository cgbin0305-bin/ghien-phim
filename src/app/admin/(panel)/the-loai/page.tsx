import type { Metadata } from "next";
import Link from "next/link";
import { Film } from "lucide-react";
import { getStore } from "@/lib/data";
import { GenreManager, type GenreWithCount } from "@/components/admin/genre-manager";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Quản lý thể loại phim" };
export const dynamic = "force-dynamic";

export default async function AdminGenresPage() {
  const store = await getStore();
  const [genres, movies] = await Promise.all([
    store.getGenres(),
    store.listAllMoviesForAdmin(),
  ]);

  const genresWithCount: GenreWithCount[] = genres.map((genre) => {
    const movieCount = movies.filter((m) => m.genres.some((g) => g.id === genre.id)).length;
    return {
      ...genre,
      movieCount,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-parchment-100">
            Quản lý thể loại phim
          </h1>
          <p className="mt-1 text-sm text-parchment-300/80">
            Thêm mới, chỉnh sửa tên/slug, sắp xếp thứ tự hiển thị hoặc xoá các thể loại phim.
          </p>
        </div>

        <Button asChild variant="secondary">
          <Link href="/admin/phim">
            <Film aria-hidden="true" />
            Quản lý phim
          </Link>
        </Button>
      </div>

      <GenreManager genres={genresWithCount} />
    </div>
  );
}
