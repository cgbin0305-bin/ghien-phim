import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { getStore } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { EpisodeManager } from "@/components/admin/episode-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const movie = await store.getMovieById(id);
  return { title: movie ? `Tập: ${movie.title}` : "Quản lý tập" };
}

export default async function AdminEpisodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const [movie, episodes] = await Promise.all([store.getMovieById(id), store.listEpisodes(id)]);

  if (!movie) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/phim"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-parchment-300/80 transition-colors hover:text-gold-300"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Danh sách phim
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
          Quản lý tập — {movie.title}
        </h1>
        <p className="mt-1.5 text-sm text-parchment-300/85">
          {episodes.length} tập · {episodes.filter((e) => e.status === "published").length} đã xuất bản
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/admin/phim/${movie.id}/edit`}>
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            Sửa thông tin phim
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/phim/${movie.slug}`}>
            <Plus className="hidden" aria-hidden="true" />
            Xem trang công khai
          </Link>
        </Button>
      </div>

      <EpisodeManager
        movieId={movie.id}
        movieSlug={movie.slug}
        movieStatus={movie.status}
        movieContext={{
          title: movie.title,
          originalTitle: movie.originalTitle,
          synopsis: movie.synopsis,
          posterUrl: movie.posterUrl,
          backdropUrl: movie.backdropUrl,
          releaseStatus: movie.releaseStatus,
          genres: movie.genres,
        }}
        episodes={episodes}
      />
    </div>
  );
}
