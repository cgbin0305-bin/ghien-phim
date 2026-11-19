import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft, Play } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { getPublicStore } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SealStampButton } from "@/components/ui/seal-stamp-button";
import { MovieCard } from "@/components/movie/movie-card";
import { BookmarkButton } from "@/components/movie/bookmark-button";
import { ScrollUnfurlTrigger } from "@/components/movie/scroll-unfurl-modal";
import { StaggeredMovieGrid } from "@/components/effects/staggered-movie-grid";
import { SectionHeading } from "@/components/layout/section-heading";
import { formatDateTime, getTodayKey, getWeekStart } from "@/lib/date";
import type { Episode, MovieWithStats } from "@/lib/types";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const RELEASE_LABELS = {
  upcoming: "Sắp chiếu",
  airing: "Đang chiếu",
  completed: "Hoàn thành",
} as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStore();
  const movie = await store.getMovieBySlug(slug);

  if (!movie || movie.status !== "published") {
    return { title: "Không tìm thấy phim", robots: { index: false, follow: false } };
  }

  const description =
    movie.synopsis ??
    `${movie.title}${movie.originalTitle ? ` (${movie.originalTitle})` : ""} - xem phụ đề tiếng Việt.`;

  return {
    title: movie.title,
    description: description.slice(0, 300),
    alternates: { canonical: `/phim/${movie.slug}` },
    openGraph: {
      type: "video.tv_show",
      title: movie.title,
      description: description.slice(0, 300),
      images: movie.posterUrl ? [{ url: movie.posterUrl }] : undefined,
      locale: "vi_VN",
    },
    robots: { index: true, follow: true },
  };
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const store = await getPublicStore();

  const movie = await store.getMovieBySlug(slug);
  if (!movie) notFound();

  // Phim bản nháp không được hiển thị công khai.
  if (movie.status !== "published") notFound();

  const [episodes, related, week] = await Promise.all([
    store.listEpisodes(movie.id),
    store.getRelatedMovies(movie, 6),
    store.getScheduleForWeek(getWeekStart(getTodayKey())),
  ]);

  const publishedEpisodes = episodes.filter((e) => e.status === "published");
  const latestEpisode = publishedEpisodes[publishedEpisodes.length - 1] ?? null;
  const firstEpisode = publishedEpisodes[0] ?? null;
  const movieSchedule = week.events
    .filter((e) => e.movieId === movie.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: movie.title,
    alternateName: movie.originalTitle ?? undefined,
    description: movie.synopsis ?? undefined,
    genre: movie.genres.map((g) => g.name),
    datePublished: movie.year ? `${movie.year}-01-01` : undefined,
    countryOfOrigin: movie.country ?? "Trung Quốc",
    numberOfEpisodes: publishedEpisodes.length > 0 ? publishedEpisodes.length : undefined,
    image: movie.posterUrl ?? undefined,
    inLanguage: "vi",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative isolate overflow-hidden border-b border-ink-700/60">
        <div className="absolute inset-0 -z-10">
          {movie.backdropUrl && (
            <SafeImage
              src={movie.backdropUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          {/*
            Trước đây ảnh đặt `opacity-25` và bị phủ thêm hai gradient + nền
            mist, nên độ hiện thực tế chỉ còn khoảng 0–12%: gần như không thấy
            backdrop. Nay ảnh hiện đầy đủ.

            Bố cục trang này khác hero: poster ở CỘT TRÁI, toàn bộ chữ ở CỘT
            PHẢI. Vì vậy gradient ngang được đảo — nhạt ở trái để ảnh quanh
            poster hiện rõ, đậm dần sang phải để chữ đọc được.
          */}
          <div className="absolute inset-0 bg-ink-950/75 md:hidden" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent via-ink-950/45 via-35% to-ink-950/92 md:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent via-75% to-transparent" />
        </div>

        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12">
          <Link
            href="/phim"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-parchment-300/80 transition-colors hover:text-gold-200"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            Danh sách phim
          </Link>

          <div className="mt-6 grid gap-8 md:grid-cols-[320px_minmax(0,1fr)] lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[420px] md:mx-0">
              <div className="relative aspect-video overflow-hidden rounded-md border border-ink-700 bg-ink-850 shadow-lift">
                {movie.posterUrl && (
                  <SafeImage
                    src={movie.posterUrl}
                    alt={`Poster ${movie.title}`}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 420px"
                    className="object-cover"
                  />
                )}
              </div>
            </div>

            <div className="text-shadow-hero min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    movie.releaseStatus === "airing"
                      ? "jade"
                      : movie.releaseStatus === "upcoming"
                        ? "gold"
                        : "outline"
                  }
                >
                  {RELEASE_LABELS[movie.releaseStatus]}
                </Badge>
                {movie.subtitleLabel && (
                  <Badge variant="default">
                    {movie.subtitleLabel === "thuyet_minh" ? "Thuyết minh" : "Vietsub"}
                  </Badge>
                )}
                {movie.genres.map((genre) => (
                  <Badge key={genre.id} variant="outline">
                    {genre.name}
                  </Badge>
                ))}
              </div>

              <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight text-parchment-100 text-balance sm:text-4xl">
                {movie.title}
              </h1>
              {movie.originalTitle && (
                <p className="mt-1.5 font-serif text-lg text-gold-200/70">{movie.originalTitle}</p>
              )}

              <dl className="mt-5 grid gap-x-8 gap-y-3 text-base font-bold sm:grid-cols-2">
                <MetaRow label="Quốc gia" value={movie.country} />
                <MetaRow label="Ngôn ngữ / Phụ đề" value="Tiếng Quan · Phụ đề tiếng Việt" />
                <MetaRow
                  label="Tổng tập"
                  value={
                    publishedEpisodes.length > 0
                      ? `${publishedEpisodes.length} tập đã xuất bản`
                      : "Chưa có tập"
                  }
                />
              </dl>

              {movie.synopsis && (
                <div className="mt-6 max-w-3xl">
                  <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gold-300/90">
                    Nội dung
                  </h2>
                  <p className="mt-2 text-base font-bold leading-relaxed text-parchment-100 text-pretty sm:text-lg">
                    {movie.synopsis}
                  </p>
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {latestEpisode ? (
                  <SealStampButton
                    href={`/xem/${movie.slug}/${latestEpisode.slug}`}
                    variant="cinnabar"
                    className="h-12 px-7 text-base"
                  >
                    <Play className="size-4 fill-current" aria-hidden="true" />
                    <span>Xem {formatEpisodeLabel(latestEpisode)}</span>
                  </SealStampButton>
                ) : (
                  <Button size="lg" disabled>
                    Chưa có tập để xem
                  </Button>
                )}
                {firstEpisode && latestEpisode && firstEpisode.id !== latestEpisode.id && (
                  <SealStampButton
                    href={`/xem/${movie.slug}/${firstEpisode.slug}`}
                    variant="outline"
                    className="h-12 px-6 text-base"
                  >
                    <span>Từ {formatEpisodeLabel(firstEpisode)}</span>
                  </SealStampButton>
                )}
                <ScrollUnfurlTrigger
                  movie={movie}
                  label="Họa Quyển Chi Tiết"
                  className="h-10 px-4 text-sm"
                />
                <BookmarkButton
                  variant="pill"
                  movieId={movie.id}
                  slug={movie.slug}
                  title={movie.title}
                  originalTitle={movie.originalTitle}
                  posterUrl={movie.posterUrl}
                  year={movie.year}
                  publishedEpisodeCount={publishedEpisodes.length}
                  className="h-10 px-4 text-sm"
                />
              </div>

              {publishedEpisodes.length === 0 && (
                <p className="mt-4 rounded-md border border-gold-500/25 bg-gold-500/[0.06] px-4 py-3 text-sm text-gold-100/85">
                  Phim đang trong trạng thái <strong>sắp chiếu</strong>. Các tập sẽ được đăng khi
                  quản trị viên xuất bản — hãy xem lịch chiếu để biết thời gian dự kiến.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-14 px-4 py-12 sm:px-6">
        <EpisodeList movie={movie} episodes={publishedEpisodes} />

        {movieSchedule.length > 0 && (
          <section aria-labelledby="phim-lich-chieu" className="space-y-4">
            <SectionHeading
              id="phim-lich-chieu"
              title="Lịch chiếu sắp tới"
              description="Các tập dự kiến lên sóng trong tuần này."
              href="/lich-chieu"
              linkLabel="Lịch đầy đủ"
            />
            <ul className="space-y-2">
              {movieSchedule.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-ink-700 bg-ink-850/50 px-4 py-3 text-sm"
                >
                  <CalendarClock className="size-4 shrink-0 text-gold-300" aria-hidden="true" />
                  <span className="text-parchment-100">
                    Tập {event.episodeNumber ?? "?"}
                  </span>
                  <span className="text-parchment-300/85">{formatDateTime(event.scheduledAt)}</span>
                  {event.note && (
                    <span className="text-xs text-mist-500">{event.note}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="phim-lien-quan" className="space-y-5">
            <SectionHeading id="phim-lien-quan" title="Phim liên quan" />
            <StaggeredMovieGrid
              staggerMs={70}
              className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-6"
            >
              {related.map((m) => (
                <MovieCard key={m.id} movie={m} />
              ))}
            </StaggeredMovieGrid>
          </section>
        )}
      </div>
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-3 border-b border-ink-800/70 pb-2.5">
      <dt className="w-36 shrink-0 text-sm font-bold uppercase tracking-wider text-parchment-300/85">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-base font-bold text-parchment-100">{value ?? "—"}</dd>
    </div>
  );
}

function formatEpisodeLabel(episode: Episode): string {
  const trimmed = episode.title.trim();
  if (!trimmed || /^\d+$/.test(trimmed)) {
    return `Tập ${episode.episodeNumber}`;
  }
  return trimmed;
}

function EpisodeList({
  movie,
  episodes,
}: {
  movie: MovieWithStats;
  episodes: Episode[];
}) {
  if (episodes.length === 0) {
    return (
      <section aria-labelledby="danh-sach-tap">
        <h2 id="danh-sach-tap" className="font-serif text-xl font-semibold text-parchment-100">
          Danh sách tập
        </h2>
        <p className="panel mt-4 px-5 py-8 text-center text-sm text-parchment-300/80">
          Chưa có tập nào được xuất bản cho phim này.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="danh-sach-tap" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="danh-sach-tap" className="font-serif text-xl font-semibold text-parchment-100">
          Danh sách tập &amp; Phần
        </h2>
        <p className="text-sm text-parchment-300/80">
          {episodes.length} mục đã xuất bản — chọn một tập/phần để xem
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {episodes.map((episode) => {
          const label = formatEpisodeLabel(episode);
          const partCount = episode.sources.length;
          return (
            <li key={episode.id}>
              <Link
                href={`/xem/${movie.slug}/${episode.slug}`}
                className="card-cinematic shine-effect group flex min-h-12 items-center justify-between gap-2.5 rounded-lg border border-ink-700 bg-ink-850/75 px-3.5 py-2.5 text-sm font-medium text-parchment-100 hover:border-gold-500/45 hover:bg-ink-800 hover:text-gold-200"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded border border-ink-700 bg-ink-900 text-xs tabular-nums text-gold-300 transition-colors group-hover:border-gold-500/50 group-hover:bg-gold-500/15">
                    {episode.episodeNumber}
                  </span>
                  <span className="truncate">{label}</span>
                </span>
                {partCount > 1 ? (
                  <span className="shrink-0 rounded-full border border-gold-500/35 bg-gold-500/10 px-2 py-0.5 text-xs text-gold-200">
                    {partCount} phần
                  </span>
                ) : (
                  <Play
                    className="size-3.5 shrink-0 text-gold-300 opacity-70 transition-transform duration-200 group-hover:scale-110 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                )}
                <span className="sr-only">
                  {label} của {movie.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}