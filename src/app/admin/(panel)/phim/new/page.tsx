import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getStore } from "@/lib/data";
import { MovieForm } from "@/components/admin/movie-form";
import { createMovieAction } from "@/app/admin/(panel)/phim/actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Thêm phim" };

export default async function NewMoviePage() {
  const store = await getStore();
  const genres = await store.getGenres();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/phim"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-parchment-300/80 transition-colors hover:text-gold-300"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Danh sách phim
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
          Thêm phim mới
        </h1>
        <p className="mt-1.5 text-sm text-parchment-300/85">
          Phim có thể được lưu dưới dạng bản nháp trước khi xuất bản.
        </p>
      </div>

      <MovieForm genres={genres} defaults={{}} action={createMovieAction} submitLabel="Tạo phim" />
    </div>
  );
}
