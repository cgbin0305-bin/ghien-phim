import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ListVideo } from "lucide-react";
import { getStore } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { MovieForm } from "@/components/admin/movie-form";
import { updateMovieAction } from "@/app/admin/(panel)/phim/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const movie = await store.getMovieById(id);
  return { title: movie ? `Sửa: ${movie.title}` : "Sửa phim" };
}

export default async function EditMoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const [movie, genres] = await Promise.all([store.getMovieById(id), store.getGenres()]);

  if (!movie) notFound();

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
          {movie.title}
        </h1>
        <p className="mt-1.5 text-sm text-parchment-300/85">
          {movie.publishedEpisodeCount}/{movie.episodeCount} tập đã xuất bản
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/admin/phim/${movie.id}/episodes`}>
            <ListVideo aria-hidden="true" />
            Quản lý tập &amp; nguồn video
          </Link>
        </Button>
      </div>

      <MovieForm
        genres={genres}
        movieId={movie.id}
        action={updateMovieAction}
        submitLabel="Lưu thay đổi"
        defaults={{
          title: movie.title,
          originalTitle: movie.originalTitle,
          slug: movie.slug,
          synopsis: movie.synopsis,
          posterUrl: movie.posterUrl,
          backdropUrl: movie.backdropUrl,
          status: movie.status,
          releaseStatus: movie.releaseStatus,
          genreIds: movie.genres.map((g) => g.id),
        }}
      />
    </div>
  );
}
