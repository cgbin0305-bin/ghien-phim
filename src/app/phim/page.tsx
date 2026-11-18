import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getPublicStore } from "@/lib/data";
import { MovieFilters } from "@/components/movie/movie-filters";
import { MovieCard } from "@/components/movie/movie-card";
import { Pagination } from "@/components/movie/pagination";
import { PosterSkeleton } from "@/components/ui/skeleton";
import type { ReleaseStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Danh sách phim",
  description:
    "Khám phá phim cổ trang, tiên hiệm, kiếm hiệp, cung đấu và huyền huyễn Trung Hoại kèm phụ đề tiếng Việt.",
  alternates: { canonical: "/phim" },
};

export const revalidate = 300;

interface SearchParams {
  q?: string;
  genre?: string;
  year?: string;
  releaseStatus?: string;
  sort?: string;
  page?: string;
}

/**
 * Six per page. This keeps the page grid balanced (2 / 3 / 4 / 6 columns) and
 * guarantees the demo catalogue - which ships eight movies - exercises the
 * pagination control instead of always fitting on a single screen.
 */
const PER_PAGE = 6;

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const store = await getPublicStore();

  const query = (params.q ?? "").trim();
  const genre = params.genre ?? "";
  const year = params.year ? Number(params.year) : undefined;
  const releaseStatus = (params.releaseStatus ?? "all") as ReleaseStatus | "all";
  const sort = (params.sort ?? "recent") as "recent" | "newest" | "year";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  // Chỉ cần danh sách năm cho bộ lọc. Trước đây trang tải **200 phim đầy đủ**
  // (kèm thể loại và đếm tập cho từng phim — 3 vòng PostgREST) rồi mới rút ra
  // danh sách năm. `listMovieYears` chỉ select cột `year` của phim đã xuất bản.
  const [result, genres, years] = await Promise.all([
    store.listMovies({
      query: query || undefined,
      genre: genre || undefined,
      year: Number.isFinite(year) ? year : undefined,
      releaseStatus,
      sort,
      page,
      perPage: PER_PAGE,
    }),
    store.getGenres(),
    store.listMovieYears(),
  ]);

  const hasFilters = Boolean(query || genre || year || releaseStatus !== "all");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold text-parchment-100 sm:text-4xl">
          Danh sách phim
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-parchment-300/85">
          Lọc theo tên Việt hoặc tên gốc, thể loại, năm phát hành và trạng thái. Tất cả bộ lọc được
          lưu trên URL để bạn có thể chia sẻ hoặc quay lại.
        </p>
      </header>

      <MovieFilters
        genres={genres.map((g) => ({ value: g.slug, label: g.name }))}
        years={years}
        initial={{
          q: query,
          genre,
          year: year ? String(year) : "",
          releaseStatus,
          sort,
        }}
      />

      <div className="mt-8 flex items-baseline justify-between gap-4 border-b border-ink-700/70 pb-3">
        <p className="text-sm text-parchment-300/85" aria-live="polite">
          {result.total === 0
            ? "Không tìm thấy phim nào"
            : `Hiển thị ${result.movies.length} / ${result.total} phim`}
        </p>
        {hasFilters && (
          <p className="text-xs uppercase tracking-[0.14em] text-gold-300/70">Đang lọc</p>
        )}
      </div>

      {result.total === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <Suspense fallback={<MovieGridSkeleton />}>
            <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.movies.map((movie, index) => (
                <MovieCard key={movie.id} movie={movie} priority={index < 4} />
              ))}
            </div>
          </Suspense>

          {result.totalPages > 1 && (
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              searchParams={params as Record<string, string | undefined>}
            />
          )}
        </>
      )}
    </div>
  );
}

function MovieGridSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="panel mt-6 flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h2 className="font-serif text-lg text-parchment-100">
        {hasFilters ? "Không có kết quả phù hợp" : "Chưa có phim nào được xuất bản"}
      </h2>
      <p className="max-w-md text-sm leading-relaxed text-parchment-300/80">
        {hasFilters
          ? "Hãy thử bỏ bớt bộ lọc hoặc tìm kiếm bằng tên khác. Bạn cũng có thể tìm theo tên gốc của phim."
          : "Khi quản trị viên xuất bản phim đầu tiên, chúng sẽ xuất hiện tại đây."}
      </p>
      {hasFilters && (
        <Link href="/phim" className="mt-2 text-sm text-gold-300 underline-offset-4 hover:underline">
          Xoá tất cả bộ lọc
        </Link>
      )}
    </div>
  );
}
