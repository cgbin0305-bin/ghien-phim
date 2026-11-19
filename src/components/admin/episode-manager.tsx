"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EpisodeForm } from "@/components/admin/episode-form";
import {
  createEpisodeAction,
  deleteEpisodeAction,
  toggleEpisodeStatusAction,
  updateEpisodeAction,
} from "@/app/admin/(panel)/phim/episodes-actions";
import { sortEpisodes } from "@/lib/episode-sort";
import type { Episode } from "@/lib/types";

/**
 * Episode manager for a single movie.
 *
 * Episodes are listed with their sources, can be toggled between draft and
 * published, and can be edited in a dialog. An episode can only be published
 * when it has at least one valid video source.
 */
export function EpisodeManager({
  movieId,
  movieSlug,
  movieStatus,
  episodes,
}: {
  movieId: string;
  movieSlug: string;
  movieStatus: "draft" | "published";
  episodes: Episode[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<Episode | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<Episode | null>(null);

  const sortedEpisodes = React.useMemo(() => sortEpisodes(episodes), [episodes]);

  const existingEpisodeNumbers = React.useMemo(
    () => episodes.map((ep) => ep.episodeNumber),
    [episodes],
  );

  const nextEpisodeNumber = React.useMemo(
    () => episodes.reduce((max, ep) => Math.max(max, ep.episodeNumber), 0) + 1,
    [episodes],
  );

  return (
    <div className="space-y-4">
      {movieStatus !== "published" && (
        <p className="rounded-md border border-gold-500/35 bg-gold-500/[0.07] px-4 py-3 text-xs leading-relaxed text-parchment-300/75">
          Phim cha đang ở trạng thái bản nháp. Các tập chỉ hiện công khai khi phim cha cũng được
          xuất bản.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold text-parchment-100">Danh sách tập</h2>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Thêm tập
        </Button>
      </div>

      {sortedEpisodes.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-serif text-base text-parchment-200">Chưa có tập nào</p>
          <p className="mt-1.5 text-sm text-parchment-300/80">
            Thêm tập đầu tiên kèm URL nguồn video hợp lệ.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedEpisodes.map((episode) => (
            <li key={episode.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-base font-semibold text-parchment-100">
                      {episode.title || `Tập ${episode.episodeNumber}`}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      STT #{episode.episodeNumber}
                    </Badge>
                    <Badge variant={episode.status === "published" ? "jade" : "muted"}>
                      {episode.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                    </Badge>
                    {episode.sources.length > 1 && (
                      <Badge variant="gold">{episode.sources.length} phần / nguồn</Badge>
                    )}
                    {episode.sources.length === 0 && (
                      <Badge variant="rouge">Chưa có nguồn video</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-mist-400">
                    Đường dẫn: <span className="text-parchment-300">/xem/{movieSlug}/{episode.slug}</span>
                    {episode.releaseDate ? ` · Phát hành ${episode.releaseDate}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form
                    action={async (formData) => {
                      await toggleEpisodeStatusAction(formData);
                      toast(
                        episode.status === "published"
                          ? `Đã chuyển Tập ${episode.episodeNumber} về bản nháp.`
                          : `Đã xuất bản Tập ${episode.episodeNumber}.`,
                        "success",
                      );
                      router.refresh();
                    }}
                  >
                    <input type="hidden" name="id" value={episode.id} />
                    <input type="hidden" name="movieId" value={movieId} />
                    <Button type="submit" variant="secondary" size="sm">
                      {episode.status === "published" ? "Chuyển về nháp" : "Xuất bản"}
                    </Button>
                  </form>

                  {episode.status === "published" && (
                    <Button asChild variant="ghost" size="sm">
                      <a href={`/xem/${movieSlug}/${episode.slug}`}>Xem thử</a>
                    </Button>
                  )}

                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(episode)}>
                    Sửa
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(episode)}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              {episode.sources.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-ink-800 pt-3">
                  {episode.sources.map((source) => (
                    <li
                      key={source.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-parchment-300/85"
                    >
                      <Badge variant="outline" className="uppercase">
                        {source.provider}
                      </Badge>
                      <span className="text-parchment-200/90">{source.label}</span>
                      <span className="truncate text-mist-500">{source.sourceUrl}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Create episode */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Thêm tập mới</DialogTitle>
            <DialogDescription>
              Mỗi tập cần ít nhất một nguồn video hợp lệ nếu bạn muốn xuất bản.
            </DialogDescription>
          </DialogHeader>
          <EpisodeForm
            movieId={movieId}
            defaults={{}}
            nextEpisodeNumber={nextEpisodeNumber}
            existingEpisodeNumbers={existingEpisodeNumbers}
            action={createEpisodeAction}
            submitLabel="Tạo tập"
            onSuccess={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit episode */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sửa tập {editing?.episodeNumber}</DialogTitle>
            <DialogDescription>
              Thay đổi sẽ được áp dụng ngay sau khi lưu.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <EpisodeForm
              movieId={movieId}
              defaults={{
                id: editing.id,
                episodeNumber: editing.episodeNumber,
                title: editing.title,
                slug: editing.slug,
                releaseDate: editing.releaseDate,
                status: editing.status,
                description: editing.description,
                sources: editing.sources.map((s) => ({
                  id: s.id,
                  provider: s.provider,
                  sourceUrl: s.sourceUrl,
                  label: s.label,
                })),
              }}
              action={updateEpisodeAction}
              submitLabel="Lưu thay đổi"
              onSuccess={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Xoá tập ${pendingDelete?.episodeNumber ?? ""}?`}
        description="Thao tác này xoá vĩnh viễn tập và toàn bộ nguồn video của tập."
        consequences={[
          "Các nguồn video đã cấu hình cho tập sẽ bị xoá.",
          "Lịch chiếu tham chiếu tập này sẽ không còn tập được chọn.",
          "Khách đang xem tập này sẽ gặp trang không tồn tại.",
        ]}
        confirmLabel="Xoá tập"
        action={deleteEpisodeAction}
        hiddenFields={
          pendingDelete ? { id: pendingDelete.id, movieId, confirm: pendingDelete.id } : undefined
        }
      />
    </div>
  );
}
