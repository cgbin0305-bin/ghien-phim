"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/admin/submit-button";
import { LogoPreview } from "@/components/admin/logo-preview";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { useToast } from "@/components/ui/toast";
import { updateSettingsAction } from "@/app/admin/(panel)/cai-dat/actions";
import type { MovieWithStats, SiteSettings } from "@/lib/types";

const formSchema = z.object({
  siteName: z.string().trim().min(1, "Tên website không được để trống."),
  siteDescription: z.string().trim(),
  logoUrl: z.string().trim(),
  contactEmail: z.string().trim(),
  contactNote: z.string().trim(),
  seoTitle: z.string().trim(),
  seoDescription: z.string().trim(),
  ogImageUrl: z.string().trim(),
  featuredMovieId: z.string().trim(),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export function SettingsForm({
  settings,
  movies,
}: {
  settings: SiteSettings;
  movies: MovieWithStats[];
}) {
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [featuredMovieId, setFeaturedMovieId] = React.useState(settings.featuredMovieId ?? "");

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription ?? "",
      logoUrl: settings.logoUrl ?? "",
      contactEmail: settings.contactEmail ?? "",
      contactNote: settings.contactNote ?? "",
      seoTitle: settings.seoTitle ?? "",
      seoDescription: settings.seoDescription ?? "",
      ogImageUrl: settings.ogImageUrl ?? "",
      featuredMovieId: settings.featuredMovieId ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value ?? "");
    }
    formData.set(
      "featuredMovieId",
      featuredMovieId === "__none__" ? "" : featuredMovieId,
    );

    const result = await updateSettingsAction({}, formData);
    if (result?.error) {
      setServerError(result.error);
      toast(result.error, "error");
      if (result.fieldErrors) {
        for (const [name, message] of Object.entries(result.fieldErrors)) {
          setError(name as never, { type: "server", message });
        }
      }
    }
    if (result?.success) {
      setServerSuccess(result.success);
      toast(result.success, "success");
    }
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
        <h2 className="font-serif text-base font-semibold text-parchment-100">Thông tin website</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="siteName">Tên website</Label>
            <Input id="siteName" {...register("siteName")} />
            {errors.siteName && <p className="text-xs text-rouge-300">{errors.siteName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="logoUrl">URL logo</Label>
            <Input id="logoUrl" placeholder="https://…" {...register("logoUrl")} />
            {errors.logoUrl && <p className="text-xs text-rouge-300">{errors.logoUrl.message}</p>}
            <LogoPreview url={watch("logoUrl") ?? ""} />
            <ImageUploadField
              id="logoUpload"
              label="Hoặc tải logo lên"
              hint="Tải ảnh lên Supabase Storage và tự điền URL — không phải copy link từ trang quản trị Supabase."
              value={watch("logoUrl") ?? ""}
              onUploaded={(url) => setValue("logoUrl", url, { shouldDirty: true })}
              aspect="square"
              showInput={false}
              className="mt-2"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="siteDescription">Mô tả website</Label>
            <textarea
              id="siteDescription"
              rows={2}
              className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-parchment-100 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              {...register("siteDescription")}
            />
            {errors.siteDescription && (
              <p className="text-xs text-rouge-300">{errors.siteDescription.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5 sm:p-6">
        <h2 className="font-serif text-base font-semibold text-parchment-100">Liên hệ</h2>
        <p className="text-xs leading-relaxed text-parchment-300/80">
          Để trống nếu chưa muốn hiển thị. Footer sẽ bỏ qua các trường không có giá trị.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Email liên hệ</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="lienhe@example.com"
              {...register("contactEmail")}
            />
            {errors.contactEmail && (
              <p className="text-xs text-rouge-300">{errors.contactEmail.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactNote">Ghi chú liên hệ</Label>
            <Input id="contactNote" {...register("contactNote")} />
            {errors.contactNote && (
              <p className="text-xs text-rouge-300">{errors.contactNote.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5 sm:p-6">
        <h2 className="font-serif text-base font-semibold text-parchment-100">SEO</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle">Tiêu đề SEO mặc định</Label>
            <Input id="seoTitle" {...register("seoTitle")} />
            {errors.seoTitle && <p className="text-xs text-rouge-300">{errors.seoTitle.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ogImageUrl">Ảnh Open Graph</Label>
            <Input id="ogImageUrl" placeholder="https://…" {...register("ogImageUrl")} />
            {errors.ogImageUrl && (
              <p className="text-xs text-rouge-300">{errors.ogImageUrl.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="seoDescription">Mô tả SEO mặc định</Label>
            <textarea
              id="seoDescription"
              rows={2}
              className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-parchment-100 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              {...register("seoDescription")}
            />
            {errors.seoDescription && (
              <p className="text-xs text-rouge-300">{errors.seoDescription.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5 sm:p-6">
        <h2 className="font-serif text-base font-semibold text-parchment-100">Phim nổi bật</h2>
        <div className="space-y-1.5">
          <Label htmlFor="featuredMovieId">Phim hiển thị ở hero trang chủ</Label>
          <Select value={featuredMovieId} onValueChange={setFeaturedMovieId}>
            <SelectTrigger id="featuredMovieId">
              <SelectValue placeholder="Chưa chọn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Chưa chọn</SelectItem>
              {movies.map((movie) => (
                <SelectItem key={movie.id} value={movie.id}>
                  {movie.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="featuredMovieId" value={featuredMovieId} />
          <p className="text-xs text-parchment-300/75">
            Nếu chưa chọn, trang chủ sẽ dùng phim có cờ “nổi bật” trong danh sách phim.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-700 pt-6">
        <SubmitButton pending={isSubmitting}>Lưu cài đặt</SubmitButton>
        <p className="text-xs text-parchment-300/75">
          Biến môi trường và secret không thể chỉnh sửa từ giao diện này.
        </p>
      </div>
    </form>
  );
}
