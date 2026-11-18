"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Edit3, Film, Info, Plus, Sparkles, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { SubmitButton } from "@/components/admin/submit-button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  createGenreAction,
  updateGenreAction,
  deleteGenreAction,
} from "@/app/admin/(panel)/the-loai/actions";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { Genre } from "@/lib/types";

interface SuggestedGenre {
  name: string;
  description: string;
}

const SUGGESTED_GENRES: readonly SuggestedGenre[] = [
  { name: "Cổ Trang", description: "Phim lấy bối cảnh triều đại, cung đình và giang hồ xưa." },
  { name: "Tiên Hiệp", description: "Tu tiên, luyện đan, độ kiếp và đại chiến tam giới." },
  { name: "Kiếm Hiệp", description: "Giang hồ võ lâm, ân oán môn phái và tuyệt kỹ kiếm pháp." },
  { name: "Cung Đấu", description: "Mưu lược hậu cung, tranh quyền đoạt vị chốn hoàng thành." },
  { name: "Huyền Huyễn", description: "Thế giới kỳ ảo phương Đông, huyết mạch thần thú và dị giới." },
  { name: "Trọng Sinh", description: "Sống lại kiếp mới, nghịch thiên cải mệnh và báo thù." },
  { name: "Xuyên Không", description: "Du hành vượt thời không về cổ đại hoặc dị giới." },
  { name: "Tu Chân", description: "Hành trình tu luyện từ phàm nhân bước lên đỉnh cao đại đạo." },
  { name: "Nữ Cường", description: "Nữ chính thông minh, quyết đoán, tự chủ vận mệnh." },
];

export interface GenreWithCount extends Genre {
  movieCount: number;
}

export function GenreManager({ genres }: { genres: GenreWithCount[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const nextSortOrder = React.useMemo(() => {
    if (genres.length === 0) return 1;
    return Math.max(...genres.map((g) => g.sortOrder ?? 0)) + 1;
  }, [genres]);

  const [editing, setEditing] = React.useState<GenreWithCount | null>(null);
  const [deleting, setDeleting] = React.useState<GenreWithCount | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<string>(String(nextSortOrder));
  const [pending, setPending] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Cập nhật sortOrder mặc định khi danh sách thể loại thay đổi (chỉ khi đang ở chế độ thêm mới)
  React.useEffect(() => {
    if (!editing) {
      setSortOrder(String(nextSortOrder));
    }
  }, [nextSortOrder, editing]);

  // Tự động tạo slug từ tên thể loại khi người dùng chưa tự sửa ô slug
  React.useEffect(() => {
    if (slugTouched) return;
    setSlug(slugify(name));
  }, [name, slugTouched]);

  function resetForm() {
    setEditing(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setSortOrder(String(nextSortOrder));
    setFieldErrors({});
  }

  function handleStartEdit(genre: GenreWithCount) {
    setEditing(genre);
    setName(genre.name);
    setSlug(genre.slug);
    setSlugTouched(true);
    setDescription(genre.description ?? "");
    setSortOrder(String(genre.sortOrder ?? 0));
    setServerError(null);
    setServerSuccess(null);
    setFieldErrors({});
  }

  function handleApplySuggestion(item: SuggestedGenre) {
    setEditing(null);
    setName(item.name);
    setSlug(slugify(item.name));
    setSlugTouched(false);
    setDescription(item.description);
    setSortOrder(String(nextSortOrder));
    setServerError(null);
    setServerSuccess(null);
    setFieldErrors({});
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setServerError(null);
    setServerSuccess(null);
    setFieldErrors({});

    const formData = new FormData();
    if (editing) {
      formData.set("id", editing.id);
    }
    formData.set("name", name.trim());
    formData.set("slug", slug.trim() || slugify(name));
    formData.set("description", description.trim());
    formData.set("sortOrder", sortOrder.trim());

    try {
      const action = editing ? updateGenreAction : createGenreAction;
      const result = await action({}, formData);

      if (result.error) {
        setServerError(result.error);
        toast(result.error, "error");
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        return;
      }

      const msg =
        result.success ??
        (editing ? "Đã cập nhật thể loại thành công." : "Đã thêm thể loại mới thành công.");
      setServerSuccess(msg);
      toast(msg, "success");
      resetForm();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  // Các gợi ý chưa có trong danh sách thể loại hiện tại
  const missingSuggestions = React.useMemo(() => {
    return SUGGESTED_GENRES.filter((item) => {
      const targetSlug = slugify(item.name);
      return !genres.some(
        (g) =>
          g.slug === targetSlug ||
          (targetSlug === "tien-hiep" && g.slug === "tien-hiem") ||
          g.name.toLowerCase() === item.name.toLowerCase(),
      );
    });
  }, [genres]);

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
      {/* Cột trái: Form Thêm / Sửa thể loại */}
      <div className="panel h-fit p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-parchment-100">
            <Tags className="size-4 text-gold-300" aria-hidden="true" />
            {editing ? `Sửa: ${editing.name}` : "Thêm thể loại mới"}
          </h2>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForm();
                setServerError(null);
                setServerSuccess(null);
              }}
            >
              Huỷ sửa
            </Button>
          )}
        </div>

        {/* Gợi ý điền nhanh thể loại cổ trang phổ biến */}
        {!editing && missingSuggestions.length > 0 && (
          <div className="mt-4 rounded-md border border-gold-500/25 bg-ink-850/75 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-gold-200">
              <Sparkles className="size-3.5 text-gold-300" aria-hidden="true" />
              Gợi ý điền nhanh thể loại cổ trang:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missingSuggestions.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleApplySuggestion(item)}
                  className="inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-900 px-2.5 py-1 text-xs text-parchment-200 transition-colors hover:border-gold-500/50 hover:bg-gold-500/12 hover:text-gold-200"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {serverError && (
            <p
              role="alert"
              className="rounded-md border border-rouge-500/40 bg-rouge-500/10 px-3.5 py-2.5 text-xs text-rouge-300"
            >
              {serverError}
            </p>
          )}
          {serverSuccess && (
            <p
              role="status"
              className="rounded-md border border-jade-500/40 bg-jade-500/10 px-3.5 py-2.5 text-xs text-jade-100"
            >
              {serverSuccess}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="genre-name">Tên thể loại</Label>
            <Input
              id="genre-name"
              placeholder="VD: Trọng Sinh, Xuyên Không, Tiên Hiệp…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldErrors.name && (
              <p className="text-xs text-rouge-300">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="genre-slug">Slug đường dẫn</Label>
              <Input
                id="genre-slug"
                placeholder="trong-sinh"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
              {fieldErrors.slug ? (
                <p className="text-xs text-rouge-300">{fieldErrors.slug}</p>
              ) : (
                <p className="flex items-center gap-1 text-xs text-parchment-300/80">
                  <Info className="size-3 shrink-0" aria-hidden="true" />
                  <span>/phim?genre={slug || "…"}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="genre-sort">Thứ tự (STT)</Label>
              <Input
                id="genre-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
              {fieldErrors.sortOrder && (
                <p className="text-xs text-rouge-300">{fieldErrors.sortOrder}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="genre-desc">Mô tả ngắn (tuỳ chọn)</Label>
            <textarea
              id="genre-desc"
              rows={3}
              placeholder="Mô tả ngắn gọn về đặc trưng của thể loại này…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-parchment-100 placeholder:text-mist-500 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
            />
            {fieldErrors.description && (
              <p className="text-xs text-rouge-300">{fieldErrors.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <SubmitButton pending={pending}>
              {editing ? "Lưu thay đổi" : "Thêm thể loại"}
            </SubmitButton>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetForm();
                  setServerError(null);
                  setServerSuccess(null);
                }}
              >
                Tạo mới
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Cột phải: Danh sách thể loại */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-parchment-100">
            Danh sách thể loại ({genres.length})
          </h2>
          <p className="text-xs text-parchment-300/80">
            Sắp xếp theo Thứ tự (STT) tăng dần
          </p>
        </div>

        {genres.length === 0 ? (
          <p className="panel px-5 py-10 text-center text-sm text-parchment-300/80">
            Chưa có thể loại nào trong hệ thống. Hãy thêm thể loại đầu tiên ở khung bên trái.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {genres.map((genre, idx) => {
              const isSelected = editing?.id === genre.id;
              return (
                <li
                  key={genre.id}
                  className={cn(
                    "panel flex flex-wrap items-center justify-between gap-4 p-4 transition-colors",
                    isSelected && "border-gold-500/55 bg-gold-500/5",
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-gold-500/35 bg-gold-500/12 px-2 py-0.5 font-mono text-xs font-semibold text-gold-200">
                        #{genre.sortOrder ?? idx + 1}
                      </span>
                      <span className="font-serif text-base font-semibold text-parchment-100">
                        {genre.name}
                      </span>
                      <Badge variant="muted">/phim?genre={genre.slug}</Badge>
                      <Badge variant={genre.movieCount > 0 ? "gold" : "default"}>
                        <Film className="mr-1 size-3" aria-hidden="true" />
                        {genre.movieCount} phim
                      </Badge>
                    </div>

                    {genre.description ? (
                      <p className="text-xs leading-relaxed text-parchment-300/80">
                        {genre.description}
                      </p>
                    ) : (
                      <p className="text-xs italic text-mist-400">Chưa có mô tả.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStartEdit(genre)}
                    >
                      <Edit3 className="size-3.5" aria-hidden="true" />
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleting(genre)}
                      aria-label={`Xoá thể loại ${genre.name}`}
                      className="text-rouge-300 hover:bg-rouge-500/15 hover:text-rouge-200"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Xoá
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title={`Xoá thể loại “${deleting.name}”?`}
          description={
            deleting.movieCount > 0
              ? `Thể loại này đang được gắn cho ${deleting.movieCount} phim. Khi xoá, nhãn thể loại sẽ được gỡ khỏi các phim đó (bản thân các bộ phim không bị xoá).`
              : "Thể loại này chưa gắn với bộ phim nào và sẽ bị xoá vĩnh viễn."
          }
          confirmLabel="Xác nhận xoá thể loại"
          action={async (fd) => {
            await deleteGenreAction(fd);
            if (editing?.id === deleting.id) {
              resetForm();
            }
          }}
          hiddenFields={{
            id: deleting.id,
            confirm: deleting.id,
          }}
        />
      )}
    </div>
  );
}
