"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, PenLine } from "lucide-react";
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
import { MarkdownContent } from "@/components/movie/markdown-content";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { MovieWithStats } from "@/lib/types";

const formSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug không được để trống.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  excerpt: z.string().trim().max(600, "Tóm tắt quá dài."),
  content: z.string(),
  coverImageUrl: z.string().trim(),
  type: z.enum(["weekly_schedule", "movie_intro", "announcement"]),
  status: z.enum(["draft", "published"]),
  weekStart: z.string().trim(),
  movieIds: z.array(z.string()),
});

export type PostFormValues = z.infer<typeof formSchema>;

export interface PostFormDefaults {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  coverImageUrl?: string | null;
  type?: "weekly_schedule" | "movie_intro" | "announcement";
  status?: "draft" | "published";
  weekStart?: string | null;
  movieIds?: string[];
}

export function PostForm({
  movies,
  defaults,
  action,
  submitLabel,
  postId,
}: {
  movies: MovieWithStats[];
  defaults: PostFormDefaults;
  action: (
    prev: { error?: string; success?: string; fieldErrors?: Record<string, string> },
    formData: FormData,
  ) => Promise<{ error?: string; success?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  postId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(defaults.slug));
  const [view, setView] = React.useState<"edit" | "preview">("edit");
  const [selectedMovies, setSelectedMovies] = React.useState<string[]>(defaults.movieIds ?? []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: defaults.title ?? "",
      slug: defaults.slug ?? "",
      excerpt: defaults.excerpt ?? "",
      content: defaults.content ?? "",
      coverImageUrl: defaults.coverImageUrl ?? "",
      type: defaults.type ?? "announcement",
      status: defaults.status ?? "draft",
      weekStart: defaults.weekStart ?? "",
      movieIds: defaults.movieIds ?? [],
    },
  });

  const title = watch("title");
  const slug = watch("slug");
  const content = watch("content");
  const type = watch("type");

  React.useEffect(() => {
    if (slugTouched) return;
    setValue("slug", slugify(title), { shouldValidate: false });
  }, [title, slugTouched, setValue]);

  function toggleMovie(id: string) {
    const next = selectedMovies.includes(id)
      ? selectedMovies.filter((m) => m !== id)
      : [...selectedMovies, id];
    setSelectedMovies(next);
    setValue("movieIds", next, { shouldDirty: true });
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    const formData = new FormData();
    if (postId) formData.set("id", postId);
    formData.set("title", values.title);
    formData.set("slug", values.slug);
    formData.set("excerpt", values.excerpt);
    formData.set("content", values.content);
    formData.set("coverImageUrl", values.coverImageUrl);
    formData.set("type", values.type);
    formData.set("status", values.status);
    formData.set("weekStart", values.weekStart);
    for (const id of selectedMovies) formData.append("movieIds", id);

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

    const msg = result?.success ?? "Đã lưu bài viết thành công.";
    setServerSuccess(msg);
    toast(msg, "success");

    // Reset toàn bộ các ô nhập về trống sau khi thêm hoặc cập nhật
    reset({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImageUrl: "",
      type: "announcement",
      status: "draft",
      weekStart: "",
      movieIds: [],
    });
    setSelectedMovies([]);
    setSlugTouched(false);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
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

      <section className="panel space-y-4 p-5 sm:p-6">
        <h2 className="font-serif text-base font-semibold text-parchment-100">Thông tin bài viết</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="post-title">Tiêu đề</Label>
            <Input id="post-title" placeholder="Lịch chiếu tuần 12" {...register("title")} />
            {errors.title && <p className="text-xs text-rouge-300">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-slug">Slug</Label>
            <Input
              id="post-slug"
              {...register("slug")}
              onChange={(e) => {
                setSlugTouched(true);
                register("slug").onChange(e);
              }}
            />
            {errors.slug && <p className="text-xs text-rouge-300">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-type">Loại bài</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                setValue("type", value as "weekly_schedule" | "movie_intro" | "announcement")
              }
            >
              <SelectTrigger id="post-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly_schedule">Lịch chiếu tuần</SelectItem>
                <SelectItem value="movie_intro">Giới thiệu phim</SelectItem>
                <SelectItem value="announcement">Thông báo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-status">Trạng thái xuất bản</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as "draft" | "published")}
            >
              <SelectTrigger id="post-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Bản nháp</SelectItem>
                <SelectItem value="published">Đã xuất bản</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-weekStart">Ngày bắt đầu tuần</Label>
            <Input
              id="post-weekStart"
              type="date"
              disabled={type !== "weekly_schedule"}
              {...register("weekStart")}
            />
            <p className="text-xs text-parchment-300/75">
              {type === "weekly_schedule"
                ? "Dùng cho bài lịch chiếu tuần (ngày thứ hai của tuần)."
                : "Chỉ áp dụng với bài lịch chiếu tuần."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-cover">URL ảnh bìa</Label>
            <Input id="post-cover" placeholder="https://…" {...register("coverImageUrl")} />
            {errors.coverImageUrl && (
              <p className="text-xs text-rouge-300">{errors.coverImageUrl.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="post-excerpt">Tóm tắt</Label>
            <textarea
              id="post-excerpt"
              rows={2}
              className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm leading-relaxed text-parchment-100 placeholder:text-mist-500 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              placeholder="Tóm tắt ngắn hiển thị ở trang danh sách bài viết…"
              {...register("excerpt")}
            />
            {errors.excerpt && <p className="text-xs text-rouge-300">{errors.excerpt.message}</p>}
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-base font-semibold text-parchment-100">Nội dung</h2>
          <div className="flex rounded-md border border-ink-700 bg-ink-850 p-1">
            <button
              type="button"
              onClick={() => setView("edit")}
              aria-pressed={view === "edit"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs transition-colors",
                view === "edit"
                  ? "bg-gold-500/15 text-gold-200"
                  : "text-parchment-300/85 hover:text-parchment-100",
              )}
            >
              <PenLine className="size-3" aria-hidden="true" />
              Soạn thảo
            </button>
            <button
              type="button"
              onClick={() => setView("preview")}
              aria-pressed={view === "preview"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs transition-colors",
                view === "preview"
                  ? "bg-gold-500/15 text-gold-200"
                  : "text-parchment-300/85 hover:text-parchment-100",
              )}
            >
              <Eye className="size-3" aria-hidden="true" />
              Xem trước
            </button>
          </div>
        </div>

        {view === "edit" ? (
          <div className="space-y-1.5">
            <Label htmlFor="post-content">Nội dung Markdown</Label>
            <textarea
              id="post-content"
              rows={18}
              placeholder={"## Tiêu đề mục\n\nNội dung **đậm**, *nghiêng*, [liên kết](https://example.com).\n\n- Danh sách mục"}
              className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 font-mono text-sm leading-relaxed text-parchment-100 placeholder:text-mist-500 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              {...register("content")}
            />
            <p className="text-xs text-parchment-300/75">
              Nội dung được render bằng Markdown và lọc bằng sanitizer: mọi thẻ HTML, script và
              thuộc tính sự kiện đều bị loại bỏ trước khi hiển thị.
            </p>
          </div>
        ) : (
          <div className="min-h-[18rem] rounded-md border border-ink-700 bg-ink-900/40 p-5">
            {content.trim() ? (
              <MarkdownContent content={content} />
            ) : (
              <p className="text-sm text-mist-500">Chưa có nội dung để xem trước.</p>
            )}
          </div>
        )}
      </section>

      <section className="panel space-y-3 p-5 sm:p-6">
        <h2 className="font-serif text-base font-semibold text-parchment-100">Phim liên quan</h2>
        {movies.length === 0 ? (
          <p className="text-sm text-parchment-300/80">Chưa có phim nào trong hệ thống.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {movies.map((movie) => {
              const active = selectedMovies.includes(movie.id);
              return (
                <button
                  key={movie.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMovie(movie.id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs transition-colors",
                    active
                      ? "border-gold-500/60 bg-gold-500/12 text-gold-200"
                      : "border-ink-600 bg-ink-850 text-parchment-300/85 hover:border-ink-500 hover:text-parchment-100",
                  )}
                >
                  {movie.title}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-700 pt-6">
        <SubmitButton pending={isSubmitting}>{submitLabel}</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <a href="/admin/bai-viet">Huỷ bỏ</a>
        </Button>
        {slug && (
          <p className="text-xs text-parchment-300/75">
            Đường dẫn công khai: <span className="text-parchment-200/90">/bai-viet/{slug}</span>
          </p>
        )}
      </div>
    </form>
  );
}
