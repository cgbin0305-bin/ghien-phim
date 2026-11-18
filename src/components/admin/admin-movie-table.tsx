"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListVideo, Pencil, Search, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteMovieAction, toggleMovieFeaturedAction } from "@/app/admin/(panel)/phim/actions";
import type { MovieWithStats } from "@/lib/types";

/**
 * Admin movie table.
 *
 * Deletion goes through `ConfirmDialog`, which explains the consequences and
 * asks for an explicit confirmation. Movies that already have episodes are
 * offered "Lưu thành bản nháp" first (archiving) instead of a hard delete.
 */
export function AdminMovieTable({
  movies,
  releaseLabels,
}: {
  movies: MovieWithStats[];
  releaseLabels: Record<string, string>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [releaseFilter, setReleaseFilter] = React.useState("all");
  const [pendingDelete, setPendingDelete] = React.useState<MovieWithStats | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return movies.filter((movie) => {
      if (statusFilter !== "all" && movie.status !== statusFilter) return false;
      if (releaseFilter !== "all" && movie.releaseStatus !== releaseFilter) return false;
      if (!q) return true;
      return (
        movie.title.toLowerCase().includes(q) ||
        (movie.originalTitle ?? "").toLowerCase().includes(q) ||
        movie.slug.includes(q)
      );
    });
  }, [movies, query, statusFilter, releaseFilter]);

  return (
    <div className="space-y-4">
      <div className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist-500"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc slug…"
            className="pl-9"
            aria-label="Tìm phim"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44" aria-label="Lọc theo trạng thái xuất bản">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="published">Đã xuất bản</SelectItem>
            <SelectItem value="draft">Bản nháp</SelectItem>
          </SelectContent>
        </Select>

        <Select value={releaseFilter} onValueChange={setReleaseFilter}>
          <SelectTrigger className="sm:w-44" aria-label="Lọc theo trạng thái phát hành">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            {Object.entries(releaseLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-serif text-base text-parchment-200">Không tìm thấy phim nào</p>
          <p className="mt-1.5 text-sm text-parchment-300/80">
            Thử đổi từ khoá hoặc bỏ bớt điều kiện lọc.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="panel hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-700 bg-ink-850/60 text-xs uppercase tracking-[0.14em] text-mist-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Phim
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Tập
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Năm
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {filtered.map((movie) => (
                  <tr key={movie.id} className="transition-colors hover:bg-ink-850/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="grid size-9 shrink-0 place-items-center rounded border border-ink-700 bg-ink-800 font-serif text-xs text-gold-300/80"
                        >
                          {movie.title.slice(0, 2)}
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={`/admin/phim/${movie.id}/edit`}
                            className="block truncate font-medium text-parchment-100 hover:text-gold-200"
                          >
                            {movie.title}
                          </Link>
                          <span className="block truncate text-xs text-mist-500">
                            {movie.originalTitle ?? movie.slug}
                          </span>
                        </span>
                        {movie.isFeatured && (
                          <Badge variant="gold" className="shrink-0">
                            <Star className="size-3" aria-hidden="true" />
                            Nổi bật
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={movie.status === "published" ? "jade" : "muted"}>
                          {movie.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                        </Badge>
                        <span className="text-xs text-parchment-300/80">
                          {releaseLabels[movie.releaseStatus] ?? movie.releaseStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-parchment-300/85">
                      {movie.publishedEpisodeCount}/{movie.episodeCount}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-parchment-300/85">
                      {movie.year ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon-sm" title="Quản lý tập">
                          <Link href={`/admin/phim/${movie.id}/episodes`}>
                            <ListVideo aria-hidden="true" />
                            <span className="sr-only">Quản lý tập</span>
                          </Link>
                        </Button>

                        <Button asChild variant="ghost" size="icon-sm" title="Chỉnh sửa">
                          <Link href={`/admin/phim/${movie.id}/edit`}>
                            <Pencil aria-hidden="true" />
                            <span className="sr-only">Chỉnh sửa</span>
                          </Link>
                        </Button>

                        <form
                          action={async (formData) => {
                            await toggleMovieFeaturedAction(formData);
                            toast(
                              movie.isFeatured
                                ? `Đã bỏ đánh dấu nổi bật cho “${movie.title}”.`
                                : `Đã đặt “${movie.title}” làm phim nổi bật.`,
                              "success",
                            );
                            router.refresh();
                          }}
                        >
                          <input type="hidden" name="id" value={movie.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            title={
                              movie.isFeatured ? "Bỏ phim nổi bật" : "Đặt làm phim nổi bật"
                            }
                          >
                            <Star
                              className={movie.isFeatured ? "text-gold-300" : undefined}
                              aria-hidden="true"
                            />
                            <span className="sr-only">
                              {movie.isFeatured ? "Bỏ phim nổi bật" : "Đặt làm phim nổi bật"}
                            </span>
                          </Button>
                        </form>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Xoá phim"
                          onClick={() => setPendingDelete(movie)}
                        >
                          <Trash2 className="text-rouge-400" aria-hidden="true" />
                          <span className="sr-only">Xoá phim</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((movie) => (
              <li key={movie.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/admin/phim/${movie.id}/edit`}
                    className="min-w-0 font-medium text-parchment-100"
                  >
                    {movie.title}
                  </Link>
                  {movie.isFeatured && <Badge variant="gold">Nổi bật</Badge>}
                </div>
                <p className="mt-1 truncate text-xs text-mist-500">
                  {movie.originalTitle ?? movie.slug}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={movie.status === "published" ? "jade" : "muted"}>
                    {movie.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                  </Badge>
                  <Badge variant="outline">{releaseLabels[movie.releaseStatus]}</Badge>
                  <span className="text-xs text-parchment-300/80">
                    {movie.publishedEpisodeCount}/{movie.episodeCount} tập
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/admin/phim/${movie.id}/episodes`}>
                      <ListVideo aria-hidden="true" />
                      Tập
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/admin/phim/${movie.id}/edit`}>
                      <Pencil aria-hidden="true" />
                      Sửa
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingDelete(movie)}
                  >
                    <Trash2 className="text-rouge-400" aria-hidden="true" />
                    Xoá
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={`Xoá phim “${pendingDelete?.title ?? ""}”?`}
        description="Thao tác này không thể hoàn tác. Nếu phim đã có tập, bạn nên chuyển nó về bản nháp thay vì xoá."
        consequences={[
          "Toàn bộ tập và nguồn video của phim sẽ bị xoá vĩnh viễn.",
          "Các sự kiện lịch chiếu thuộc phim cũng sẽ bị xoá.",
          "Bài viết liên kết tới phim sẽ mất liên kết này.",
        ]}
        confirmLabel="Xoá vĩnh viễn"
        action={deleteMovieAction}
        hiddenFields={pendingDelete ? { id: pendingDelete.id, confirm: pendingDelete.id } : undefined}
      />
    </div>
  );
}
