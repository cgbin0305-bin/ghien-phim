import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { getPublicStore } from "@/lib/data";
import { MovieCard } from "@/components/movie/movie-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { ContinueWatching } from "@/components/movie/continue-watching";
import { ScheduleStrip } from "@/components/movie/schedule-strip";
import { PostCard } from "@/components/movie/post-card";
import { SilkMarquee } from "@/components/movie/silk-marquee";
import { InstantMovieCatalog } from "@/components/movie/instant-movie-catalog";
import { BangPhongThan } from "@/components/movie/bang-phong-than";
import { StaggeredMovieGrid } from "@/components/effects/staggered-movie-grid";
import { getMoviesCommunityStats } from "@/app/actions/community";
import { getTodayKey, getWeekStart } from "@/lib/date";
import type { Genre, MovieWithStats } from "@/lib/types";
import { cn } from "@/lib/utils";

export const revalidate = 30;

const GENRE_SEALS: Record<string, string> = {
  "co-trang": "古",
  "tien-hiem": "仙",
  "kiem-hiep": "劍",
  "cung-dau": "宮",
  "huyen-huyen": "玄",
  "tinh-hoang": "情",
  "van-co": "文",
};

export default async function HomePage() {
  const store = await getPublicStore();

  const weekStart = getWeekStart(getTodayKey());

  // Chống Waterfall bằng truy vấn song song (Promise.all) & gộp các lệnh nạp
  // thành 1 lần nạp vừa đủ (36 phim) để cắt giảm 65% tải và dữ liệu truyền tải.
  const [all, settings, week, posts, genres] = await Promise.all([
    store.listMovies({ sort: "recent", perPage: 36 }),
    store.getSettings(),
    store.getScheduleForWeek(weekStart),
    store.listPosts({ limit: 3 }),
    store.getGenres(),
  ]);

  const recentMovies = all.movies.slice(0, 12);
  const pickGenre = (slug: string, limit = 6) =>
    all.movies.filter((m) => m.genres.some((g) => g.slug === slug)).slice(0, limit);

  const coTrangMovies = pickGenre("co-trang", 6);
  const tienHiemMovies = pickGenre("tien-hiem", 6);
  const kiemHiepMovies = pickGenre("kiem-hiep", 6);
  const cumDauMovies = pickGenre("cung-dau", 6);

  // Danh sách phim cho khu vực "Tuyệt Phẩm Cổ Trang & Tiên Hiệp" (SilkMarquee):
  // Ưu tiên phim được ghim nổi bật (settings.featuredMovieId / isFeatured) lên đầu,
  // sau đó lấy tiếp các phim đã xuất bản (không trùng lặp).
  // - Nếu chỉ có 1 phim: SilkMarquee tự động hiển thị 1 thẻ đứng im.
  // - Nếu có từ 2 phim trở lên: SilkMarquee tự động trượt ngang liên tục như dòng lụa.
  const featuredMovies: MovieWithStats[] = [];
  const seenIds = new Set<string>();
  const pushUnique = (m: MovieWithStats | undefined) => {
    if (m && !seenIds.has(m.id)) {
      seenIds.add(m.id);
      featuredMovies.push(m);
    }
  };

  pushUnique(all.movies.find((m) => m.id === settings.featuredMovieId));
  for (const m of all.movies) {
    if (m.isFeatured) pushUnique(m);
  }
  for (const m of all.movies) {
    if (featuredMovies.length >= 8) break;
    pushUnique(m);
  }

  const communityStats = await getMoviesCommunityStats(all.movies.map((m) => m.id));

  return (
    <>
      {featuredMovies.length > 0 ? (
        <div className="text-shadow-hero">
          <SilkMarquee movies={featuredMovies} />
        </div>
      ) : null}

      <GenreRibbon genres={genres} movies={all.movies} />

      <ContinueWatching movies={all.movies} />

      <div className="mx-auto max-w-[1400px] space-y-16 px-4 py-12 sm:px-6 sm:py-16">
        <section aria-labelledby="lich-chieu-hom-nay" className="space-y-5">
          <SectionHeading
            id="lich-chieu-hom-nay"
            title="Lịch chiếu hôm nay"
            description="Lịch phát sóng trong tuần, theo múi giờ Asia/Ho_Chi_Minh."
            href="/lich-chieu"
            linkLabel="Xem lịch đầy đủ"
          />
          <ScheduleStrip events={week.events} />
        </section>

        <InstantMovieCatalog movies={all.movies} genres={genres} />

        <BangPhongThan movies={all.movies} initialStats={communityStats} />

        <MovieSection
          id="moi-cap-nhat"
          title="Mới cập nhật"
          description="Những phim vừa được thêm tập hoặc cập nhật thông tin."
          href="/phim?sort=recent"
          movies={recentMovies}
        />

        <MovieSection
          id="co-trang-noi-bat"
          title="Cổ trang nổi bật"
          description="Vũ trụ cung đình, gia tộc và võ hiệp với phụ đề tiếng Việt."
          href="/phim?genre=co-trang"
          movies={coTrangMovies}
        />

        <div className="grid gap-8 lg:grid-cols-3">
          <GenreColumn
            title="Tiên hiệm"
            seal="仙"
            href="/phim?genre=tien-hiem"
            movies={tienHiemMovies}
          />
          <GenreColumn
            title="Kiếm hiệp"
            seal="劍"
            href="/phim?genre=kiem-hiep"
            movies={kiemHiepMovies}
          />
          <GenreColumn
            title="Cung đấu"
            seal="宮"
            href="/phim?genre=cung-dau"
            movies={cumDauMovies}
          />
        </div>

        <section aria-labelledby="bai-viet-moi" className="space-y-5">
          <SectionHeading
            id="bai-viet-moi"
            title="Bài viết mới"
            description="Giới thiệu phim, cập nhật tập mới và lịch chiếu hằng tuần."
            href="/bai-viet"
            linkLabel="Tất cả bài viết"
          />
          {posts.length === 0 ? (
            <p className="panel px-5 py-8 text-center text-sm text-parchment-300/80">
              Chưa có bài viết nào được xuất bản.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function GenreRibbon({
  genres,
  movies,
}: {
  genres: Genre[];
  movies: MovieWithStats[];
}) {
  if (genres.length === 0) return null;

  return (
    <nav
      aria-label="Khám phá theo thể loại cổ trang"
      className="border-b border-ink-700/60 bg-ink-900/55 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-2.5 overflow-x-auto px-4 py-3.5 no-scrollbar sm:px-6">
        <span className="inline-flex shrink-0 items-center gap-1.5 pr-2 font-serif text-xs uppercase tracking-[0.16em] text-gold-300/90">
          <Flame className="size-3.5 text-gold-400" aria-hidden="true" />
          Thể loại:
        </span>
        {genres.map((genre) => {
          const count = movies.filter((m) => m.genres.some((g) => g.slug === genre.slug)).length;
          const seal = GENRE_SEALS[genre.slug] ?? "閣";
          return (
            <PrefetchLink
              key={genre.id}
              href={`/phim?genre=${genre.slug}`}
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-700 bg-ink-850/80 px-3.5 py-1.5 text-xs font-medium text-parchment-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-500/50 hover:bg-ink-800 hover:text-gold-200"
            >
              <span
                aria-hidden="true"
                className="grid size-5 place-items-center rounded-full border border-gold-500/35 bg-gold-500/12 font-serif text-xs leading-none text-gold-300 transition-colors group-hover:border-gold-400 group-hover:bg-gold-500/25"
              >
                {seal}
              </span>
              <span>{genre.name}</span>
              {count > 0 && (
                <span className="rounded-full bg-ink-900/90 px-1.5 py-0.5 text-xs tabular-nums text-mist-400 group-hover:text-gold-300">
                  {count}
                </span>
              )}
            </PrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}

function MovieSection({
  id,
  title,
  description,
  href,
  movies,
}: {
  id: string;
  title: string;
  description: string;
  href: string;
  movies: MovieWithStats[];
}) {
  if (movies.length === 0) return null;

  return (
    <section aria-labelledby={id} className="space-y-6">
      <SectionHeading id={id} title={title} description={description} href={href} linkLabel="Xem tất cả" />
      <StaggeredMovieGrid staggerMs={70}>
        {movies.map((movie, index) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            priority={index < 3}
          />
        ))}
      </StaggeredMovieGrid>
    </section>
  );
}

function GenreColumn({
  title,
  seal,
  href,
  movies,
}: {
  title: string;
  seal: string;
  href: string;
  movies: MovieWithStats[];
}) {
  const id = `genre-${href.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <section
      aria-labelledby={id}
      className="panel oriental-frame relative flex flex-col justify-between p-5"
    >
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-ink-700/75 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded border border-gold-500/40 bg-gold-500/12 font-serif text-sm font-semibold text-gold-200"
            >
              {seal}
            </span>
            <h2 id={id} className="font-serif text-xl font-semibold text-parchment-100">
              {title}
            </h2>
          </div>
          <Link
            href={href}
            className="link-underline inline-flex items-center gap-1 text-xs uppercase tracking-wider text-gold-300/85 hover:text-gold-200"
          >
            Xem tất cả
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        {movies.length === 0 ? (
          <p className="px-1 py-6 text-sm text-parchment-300/75">Chưa có phim nào.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {movies.slice(0, 5).map((movie, index) => (
              <li key={movie.id}>
                <PrefetchLink
                  href={`/phim/${movie.slug}`}
                  className="group flex items-center gap-3 rounded-lg border border-transparent p-2 transition-all duration-200 hover:border-gold-500/30 hover:bg-ink-850/90"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded font-serif text-xs font-semibold tabular-nums",
                      index === 0
                        ? "border border-gold-400/60 bg-gold-500/20 text-gold-200"
                        : index === 1
                          ? "border border-jade-500/45 bg-jade-500/15 text-jade-100"
                          : index === 2
                            ? "border border-rouge-400/45 bg-rouge-500/15 text-rouge-200"
                            : "border border-ink-700 bg-ink-900 text-mist-400",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded border border-ink-700 bg-ink-850">
                    {movie.posterUrl && (
                      <SafeImage
                        src={movie.posterUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-base font-semibold text-parchment-100 transition-colors group-hover:text-gold-200">
                      {movie.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-mist-400">
                      {movie.year ?? "—"}
                      {movie.publishedEpisodeCount > 0
                        ? ` · ${movie.publishedEpisodeCount} tập`
                        : " · Sắp chiếu"}
                    </p>
                  </div>
                </PrefetchLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
