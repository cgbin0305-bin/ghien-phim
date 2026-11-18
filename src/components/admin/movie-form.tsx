"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Info, Plus, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { SubmitButton } from "@/components/admin/submit-button";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import {
  createGenreAction,
  deleteGenreAction,
} from "@/app/admin/(panel)/the-loai/actions";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/slug";
import type { Genre } from "@/lib/types";

/**
 * Client-side schema mirroring `movieSchema` in `src/lib/validations/schemas.ts`.
 * The server re-validates everything, this only exists for instant feedback.
 *
 * The form is deliberately minimal: everything the visitor actually needs is
 * derived from the episodes themselves, so the admin never has to declare how
 * many episodes a movie will have.
 */
const formSchema = z.object({
  title: z.string().trim().min(1, "Tên phim không được để trống."),
  originalTitle: z.string().trim(),
  slug: z
    .string()
    .trim()
    .min(1, "Slug không được để trống.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  synopsis: z.string().trim(),
  posterUrl: z.string().trim(),
  backdropUrl: z.string().trim(),
  status: z.enum(["draft", "published"]),
  releaseStatus: z.enum(["upcoming", "airing", "completed"]),
  genreIds: z.array(z.string()),
});

export type MovieFormValues = z.infer<typeof formSchema>;

export interface MovieFormDefaults {
  title?: string;
  originalTitle?: string | null;
  slug?: string;
  synopsis?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  status?: "draft" | "published";
  releaseStatus?: "upcoming" | "airing" | "completed";
  genreIds?: string[];
}

export function MovieForm({
  genres,
  defaults,
  action,
  submitLabel,
  movieId,
}: {
  genres: Genre[];
  defaults: MovieFormDefaults;
  action: (
    prev: {
      error?: string;
      success?: string;
      redirectTo?: string;
      fieldErrors?: Record<string, string>;
    },
    formData: FormData,
  ) => Promise<{
    error?: string;
    success?: string;
    redirectTo?: string;
    fieldErrors?: Record<string, string>;
  }>;
  submitLabel: string;
  movieId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(defaults.slug));

  const [genreList, setGenreList] = React.useState<Genre[]>(genres);
  const [newGenreName, setNewGenreName] = React.useState("");
  const [addingGenre, setAddingGenre] = React.useState(false);
  const [quickDeleteMode, setQuickDeleteMode] = React.useState(false);

  React.useEffect(() => {
    setGenreList(genres);
  }, [genres]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MovieFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: defaults.title ?? "",
      originalTitle: defaults.originalTitle ?? "",
      slug: defaults.slug ?? "",
      synopsis: defaults.synopsis ?? "",
      posterUrl: defaults.posterUrl ?? "",
      backdropUrl: defaults.backdropUrl ?? "",
      status: defaults.status ?? "draft",
      releaseStatus: defaults.releaseStatus ?? "upcoming",
      genreIds: defaults.genreIds ?? [],
    },
  });

  const title = watch("title");
  const slug = watch("slug");
  const selectedGenres = watch("genreIds");

  // Auto-suggest the slug from the title until the admin edits it manually.
  React.useEffect(() => {
    if (slugTouched) return;
    setValue("slug", slugify(title), { shouldValidate: false });
  }, [title, slugTouched, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    const formData = new FormData();
    if (movieId) formData.set("id", movieId);
    formData.set("title", values.title);
    formData.set("originalTitle", values.originalTitle);
    formData.set("slug", values.slug);
    formData.set("synopsis", values.synopsis);
    formData.set("posterUrl", values.posterUrl);
    formData.set("backdropUrl", values.backdropUrl);
    formData.set("status", values.status);
    formData.set("releaseStatus", values.releaseStatus);
    for (const id of values.genreIds) formData.append("genreIds", id);

    const result = await action({}, formData);
    if (result?.error) {
      setServerError(result.error);
      toast(result.error, "error");
      if (result.fieldErrors) {
        for (const [name, message] of Object.entries(result.fieldErrors)) {
          setError(name as never, { type: "server", message });
        }
      }
      return;
    }

    const msg = result?.success ?? "Đã lưu thông tin phim thành công.";
    setServerSuccess(msg);
    toast(msg, "success");

    // Reset toàn bộ các ô nhập về trống sau khi thêm hoặc cập nhật
    reset({
      title: "",
      originalTitle: "",
      slug: "",
      synopsis: "",
      posterUrl: "",
      backdropUrl: "",
      status: "draft",
      releaseStatus: "upcoming",
      genreIds: [],
    });
    setSlugTouched(false);

    if (result?.redirectTo) {
      router.push(result.redirectTo);
      return;
    }

    router.refresh();
  });

  function toggleGenre(id: string) {
    const next = selectedGenres.includes(id)
      ? selectedGenres.filter((g) => g !== id)
      : [...selectedGenres, id];
    setValue("genreIds", next, { shouldDirty: true, shouldValidate: true });
  }

  async function handleQuickAddGenre() {
    const trimmed = newGenreName.trim();
    if (!trimmed) {
      toast("Vui lòng nhập tên thể loại mới.", "error");
      return;
    }

    setAddingGenre(true);
    try {
      const fd = new FormData();
      fd.set("name", trimmed);
      fd.set("slug", slugify(trimmed));
      fd.set("description", "");
      fd.set("sortOrder", String(genreList.length + 1));

      const result = await createGenreAction({}, fd);
      if (result.error) {
        toast(result.error, "error");
        return;
      }

      if (result.genre) {
        const created = result.genre;
        setGenreList((prev) => [...prev, created]);
        if (!selectedGenres.includes(created.id)) {
          setValue("genreIds", [...selectedGenres, created.id], {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }

      setNewGenreName("");
      toast(result.success ?? `Đã thêm thể loại “${trimmed}”.`, "success");
      router.refresh();
    } finally {
      setAddingGenre(false);
    }
  }

  async function handleQuickDeleteGenre(genre: Genre) {
    const fd = new FormData();
    fd.set("id", genre.id);
    fd.set("confirm", genre.id);
    try {
      await deleteGenreAction(fd);
      setGenreList((prev) => prev.filter((g) => g.id !== genre.id));
      if (selectedGenres.includes(genre.id)) {
        setValue(
          "genreIds",
          selectedGenres.filter((id) => id !== genre.id),
          { shouldDirty: true, shouldValidate: true },
        );
      }
      toast(`Đã xoá thể loại “${genre.name}”.`, "success");
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Không thể xoá thể loại.",
        "error",
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {serverError && (
        <p
          role="alert"
          className="rounded-md border border-rouge-500/40 bg-rouge-500/10 px-4 py-3 text-sm text-rouge-300"
        >
          {serverError}
        </p>
      )}
      {serverSuccess && (
        <p
          role="status"
          className="rounded-md border border-jade-500/40 bg-jade-500/10 px-4 py-3 text-sm text-jade-100"
        >
          {serverSuccess}
        </p>
      )}

      <Section title="Thông tin phim">
        <Field label="Tên phim (tiếng Việt)" error={errors.title?.message} htmlFor="title">
          <Input id="title" placeholder="Vấn Kiếm Lâm Ngô" {...register("title")} />
        </Field>

        <Field label="Tên gốc" error={errors.originalTitle?.message} htmlFor="originalTitle">
          <Input id="originalTitle" placeholder="倚天屠龙记" {...register("originalTitle")} />
        </Field>

        <Field
          label="Slug (đường dẫn)"
          error={errors.slug?.message}
          htmlFor="slug"
          hint="Tự động tạo từ tên phim. Đường dẫn công khai: /phim/…"
        >
          <Input
            id="slug"
            {...register("slug")}
            onChange={(e) => {
              setSlugTouched(true);
              register("slug").onChange(e);
            }}
          />
        </Field>

        <Field label="Nội dung" error={errors.synopsis?.message} htmlFor="synopsis" className="sm:col-span-2">
          <textarea
            id="synopsis"
            rows={6}
            placeholder="Giới thiệu nội dung phim…"
            className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm leading-relaxed text-parchment-100 placeholder:text-mist-500 transition-colors focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
            {...register("synopsis")}
          />
        </Field>
      </Section>

      <Section title="Thể loại">
        <div className="space-y-4 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-parchment-300/80">
              Chọn các thể loại áp dụng cho bộ phim này:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {genreList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickDeleteMode((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs transition-colors",
                    quickDeleteMode
                      ? "border-rouge-400/60 bg-rouge-500/15 text-rouge-200"
                      : "border-ink-600 bg-ink-850 text-parchment-300/85 hover:border-ink-500 hover:text-parchment-100",
                  )}
                >
                  {quickDeleteMode ? "Đóng chế độ xoá nhanh" : "Xoá nhanh thể loại"}
                </button>
              )}
              <Link
                href="/admin/the-loai"
                className="inline-flex items-center gap-1 rounded border border-gold-500/40 bg-gold-500/10 px-2.5 py-1 text-xs font-medium text-gold-200 transition-colors hover:bg-gold-500/20"
              >
                <Tags className="size-3.5" aria-hidden="true" />
                Quản lý Thể loại (Thêm / Sửa / Xoá)
              </Link>
            </div>
          </div>

          {genreList.length === 0 ? (
            <p className="text-sm text-parchment-300/80">
              Chưa có thể loại nào trong hệ thống. Hãy thêm nhanh bên dưới.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {genreList.map((genre) => {
                const active = selectedGenres.includes(genre.id);
                return (
                  <div key={genre.id} className="inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleGenre(genre.id)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs transition-colors",
                        quickDeleteMode ? "rounded-l-md border-r-0" : "rounded-md",
                        active
                          ? "border-gold-500/60 bg-gold-500/12 text-gold-200"
                          : "border-ink-600 bg-ink-850 text-parchment-300/85 hover:border-ink-500 hover:text-parchment-100",
                      )}
                    >
                      {active && <Check className="size-3" aria-hidden="true" />}
                      {genre.name}
                    </button>
                    {quickDeleteMode && (
                      <button
                        type="button"
                        onClick={() => handleQuickDeleteGenre(genre)}
                        title={`Xoá thể loại ${genre.name} khỏi hệ thống`}
                        aria-label={`Xoá thể loại ${genre.name}`}
                        className="inline-flex h-full items-center rounded-r-md border border-rouge-400/50 bg-rouge-500/15 px-2 py-1.5 text-xs text-rouge-200 transition-colors hover:bg-rouge-500/30"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Thanh thêm nhanh thể loại mới ngay trong form phim */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-ink-700/80 bg-ink-900/50 p-3">
            <Input
              value={newGenreName}
              onChange={(e) => setNewGenreName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleQuickAddGenre();
                }
              }}
              placeholder="Thêm nhanh thể loại mới (VD: Trọng Sinh, Xuyên Không…)"
              className="h-9 max-w-xs flex-1 text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={addingGenre}
              onClick={() => void handleQuickAddGenre()}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {addingGenre ? "Đang thêm…" : "Thêm & Chọn ngay"}
            </Button>
          </div>

          {/* Nút gắn nhanh tag thể loại Cổ Trang (hỗ trợ cả các tag mở rộng như Trọng Sinh) */}
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-700/60 pt-3">
            <span className="text-xs text-mist-400">Gắn nhanh tag cổ trang:</span>
            {(["Tiên Hiệp", "Kiếm Hiệp", "Cung Đấu", "Huyền Huyễn", "Trọng Sinh"] as const).map(
              (tagLabel) => {
                const currentSynopsis = watch("synopsis") ?? "";
                const tagToken = `[${tagLabel}]`;
                const matchedGenre = genreList.find(
                  (g) =>
                    g.slug === slugify(tagLabel) ||
                    (tagLabel === "Tiên Hiệp" && g.slug === "tien-hiem"),
                );
                const isTagged = matchedGenre
                  ? selectedGenres.includes(matchedGenre.id)
                  : currentSynopsis.includes(tagToken);

                return (
                  <button
                    key={tagLabel}
                    type="button"
                    onClick={() => {
                      if (matchedGenre) {
                        toggleGenre(matchedGenre.id);
                        return;
                      }
                      const nextSynopsis = currentSynopsis.includes(tagToken)
                        ? currentSynopsis.replace(tagToken, "").trim()
                        : `${currentSynopsis ? `${currentSynopsis} ` : ""}${tagToken}`;
                      setValue("synopsis", nextSynopsis, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    aria-pressed={isTagged}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      isTagged
                        ? "border-gold-400/65 bg-gold-500/15 text-gold-200"
                        : "border-ink-700 bg-ink-900/70 text-parchment-300/80 hover:border-gold-500/40 hover:text-gold-200",
                    )}
                  >
                    {isTagged && <Check className="size-3" aria-hidden="true" />}
                    #{tagLabel}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </Section>

      <Section title="Trạng thái">
        <Field label="Trạng thái xuất bản" error={errors.status?.message} htmlFor="status">
          <Select
            value={watch("status")}
            onValueChange={(value) => setValue("status", value as "draft" | "published")}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Bản nháp (chưa công khai)</SelectItem>
              <SelectItem value="published">Đã xuất bản</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Trạng thái phát hành"
          error={errors.releaseStatus?.message}
          htmlFor="releaseStatus"
          hint="Độc lập với trạng thái xuất bản"
        >
          <Select
            value={watch("releaseStatus")}
            onValueChange={(value) =>
              setValue("releaseStatus", value as "upcoming" | "airing" | "completed")
            }
          >
            <SelectTrigger id="releaseStatus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Sắp chiếu</SelectItem>
              <SelectItem value="airing">Đang chiếu</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Ảnh">
        <ImageUploadField
          id="posterUrl"
          label="URL poster (ảnh ngang)"
          hint="Ảnh bìa ngang tỷ lệ 16:9 — hiện ở ô ảnh trên trang phim, trong danh sách phim và các khối gợi ý. Bấm “Tải lên” để không phải tự dán URL."
          registration={register("posterUrl")}
          value={watch("posterUrl") ?? ""}
          onUploaded={(url) => setValue("posterUrl", url, { shouldDirty: true })}
          error={errors.posterUrl?.message}
          aspect="16/9"
          className="sm:col-span-2"
        />

        <ImageUploadField
          id="backdropUrl"
          label="URL backdrop (ảnh nền ngang)"
          hint="Ảnh nền ngang tỷ lệ 16:9 — làm ảnh bìa lớn phía sau tiêu đề ở đầu trang phim và trang chủ. Có thể bỏ trống nếu chưa có."
          registration={register("backdropUrl")}
          value={watch("backdropUrl") ?? ""}
          onUploaded={(url) => setValue("backdropUrl", url, { shouldDirty: true })}
          error={errors.backdropUrl?.message}
          aspect="16/9"
          className="sm:col-span-2"
        />
      </Section>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-700 pt-6">
        <SubmitButton pending={isSubmitting}>{submitLabel}</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <a href="/admin/phim">Huỷ bỏ</a>
        </Button>
        {slug && (
          <p className="text-xs text-parchment-300/75">
            Đường dẫn công khai: <span className="text-parchment-200/90">/phim/{slug}</span>
          </p>
        )}
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="font-serif text-base font-semibold text-parchment-100">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-rouge-300">{error}</p>
      ) : hint ? (
        <p className="flex gap-1.5 text-xs leading-relaxed text-parchment-300/80">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
}
