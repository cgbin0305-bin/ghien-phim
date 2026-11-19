"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
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
import { VideoSourcePreview } from "@/components/admin/video-source-preview";
import { PROVIDER_HINTS } from "@/lib/video/provider";
import { extractEpisodeNumbers } from "@/lib/episode-sort";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

interface SourceDraft {
  id?: string;
  provider: "youtube" | "facebook";
  sourceUrl: string;
  label: string;
}

export interface EpisodeFormDefaults {
  id?: string;
  episodeNumber?: number;
  title?: string;
  slug?: string;
  releaseDate?: string | null;
  status?: "draft" | "published";
  description?: string | null;
  sources?: SourceDraft[];
}

const formSchema = z.object({
  episodeNumber: z
    .string()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1, "Số tập phải là số nguyên từ 1 trở lên."),
  title: z.string().trim().min(1, "Tên tập không được để trống."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug không được để trống.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  releaseDate: z
    .string()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Ngày phát hành không hợp lệ."),
  description: z.string().trim(),
  status: z.enum(["draft", "published"]),
});

export function EpisodeForm({
  movieId,
  defaults,
  nextEpisodeNumber = 1,
  existingEpisodeNumbers = [],
  action,
  submitLabel,
  onSuccess,
}: {
  movieId: string;
  defaults: EpisodeFormDefaults;
  /** Số thứ tự tập tiếp theo được gợi ý tự động để không bị trùng khi thêm nhiều phần. */
  nextEpisodeNumber?: number;
  /** Danh sách các số STT đã được dùng trong phim để tránh trùng lặp khi tự động gán theo tên tập. */
  existingEpisodeNumbers?: number[];
  action: (
    prev: { error?: string; success?: string; fieldErrors?: Record<string, string> },
    formData: FormData,
  ) => Promise<{ error?: string; success?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(defaults.slug));
  const [epNumTouched, setEpNumTouched] = React.useState(Boolean(defaults.episodeNumber));

  // Bộ ghép nhanh Mùa / Tập / Phần (ví dụ: Mùa 4 Phần 1, Tập 5 Phần 2)
  const [seasonPart, setSeasonPart] = React.useState("");
  const [epNumPart, setEpNumPart] = React.useState("");
  const [subPart, setSubPart] = React.useState("");

  const [sources, setSources] = React.useState<SourceDraft[]>(
    defaults.sources && defaults.sources.length > 0
      ? defaults.sources
      : [{ provider: "youtube", sourceUrl: "", label: "Server 1 (Chính)" }],
  );
  const [bulkLinks, setBulkLinks] = React.useState("");
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(0);

  const initialEpNumber =
    defaults.episodeNumber != null ? String(defaults.episodeNumber) : String(nextEpisodeNumber);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      episodeNumber: initialEpNumber,
      title: defaults.title ?? "",
      slug: defaults.slug ?? "",
      releaseDate: defaults.releaseDate ?? "",
      description: defaults.description ?? "",
      status: defaults.status ?? "draft",
    },
  });

  const title = watch("title");
  const status = watch("status");

  // Khi người dùng nhập vào ô ghép nhanh Mùa / Tập / Phần -> tự động sinh Tên tập & Slug
  const applyQuickBuilder = React.useCallback(
    (nextSeason: string, nextEp: string, nextSub: string) => {
      const segments: string[] = [];
      if (nextSeason.trim()) segments.push(`Mùa ${nextSeason.trim()}`);
      if (nextEp.trim()) segments.push(`Tập ${nextEp.trim()}`);
      if (nextSub.trim()) segments.push(`Phần ${nextSub.trim()}`);
      if (segments.length === 0) return;

      const builtTitle = segments.join(" - ");
      setValue("title", builtTitle, { shouldDirty: true, shouldValidate: true });
      if (!slugTouched) {
        setValue("slug", slugify(builtTitle), { shouldDirty: true, shouldValidate: true });
      }
    },
    [setValue, slugTouched],
  );

  // Tự động tạo slug tập và đồng bộ STT (episodeNumber) dựa vào Tên tập cho tới khi người dùng tự sửa tay.
  React.useEffect(() => {
    if (!slugTouched) {
      setValue("slug", slugify(title), { shouldValidate: false });
    }
    if (!epNumTouched && title.trim()) {
      const nums = extractEpisodeNumbers({ title });
      const candidate = nums[0];
      if (typeof candidate === "number" && candidate >= 1) {
        const used = new Set(existingEpisodeNumbers);
        let resolved = candidate;
        while (used.has(resolved)) {
          resolved += 1;
        }
        setValue("episodeNumber", String(resolved), { shouldValidate: false });
      }
    }
  }, [title, slugTouched, epNumTouched, existingEpisodeNumbers, setValue]);

  function updateSource(index: number, patch: Partial<SourceDraft>) {
    setSources((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSource() {
    setSources((prev) => [
      ...prev,
      {
        provider: "youtube",
        sourceUrl: "",
        label: `Server ${prev.length + 1} (Dự phòng)`,
      },
    ]);
    setPreviewIndex(sources.length);
  }

  function handleBulkSplitLinks() {
    const urls = bulkLinks
      .split(/[\r\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      toast("Vui lòng dán ít nhất 1 đường dẫn YouTube hoặc Facebook.", "error");
      return;
    }

    const nextDrafts: SourceDraft[] = urls.map((url, idx) => {
      const isFb = /facebook\.com|fb\.watch/i.test(url);
      const provider: "youtube" | "facebook" = isFb ? "facebook" : "youtube";
      const tag = isFb ? "FB" : "YT";
      return {
        provider,
        sourceUrl: url,
        label: idx === 0 ? `Server 1 (Chính · ${tag})` : `Server ${idx + 1} (Dự phòng ${tag})`,
      };
    });

    setSources((prev) => {
      const nonEmptyPrev = prev.filter((s) => s.sourceUrl.trim().length > 0);
      return nonEmptyPrev.length > 0 ? [...nonEmptyPrev, ...nextDrafts] : nextDrafts;
    });
    setBulkLinks("");
    setPreviewIndex(0);
    toast(`Đã tách ${nextDrafts.length} link thành các Server phát video!`, "success");
  }

  function addPartSource() {
    setSources((prev) => {
      const normalizedPrev =
        prev.length === 1 && (prev[0]?.label === "Nguồn 1" || prev[0]?.label === "Phần 1 / Nguồn 1")
          ? [{ ...prev[0]!, label: "Phần 1" }]
          : prev;
      return [
        ...normalizedPrev,
        { provider: "youtube", sourceUrl: "", label: `Phần ${normalizedPrev.length + 1}` },
      ];
    });
    setPreviewIndex(sources.length);
  }

  function removeSource(index: number) {
    setSources((prev) => prev.filter((_, i) => i !== index));
    setPreviewIndex(null);
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    const formData = new FormData();
    formData.set("movieId", movieId);
    if (defaults.id) formData.set("id", defaults.id);
    formData.set("episodeNumber", values.episodeNumber);
    formData.set("title", values.title);
    formData.set("slug", values.slug);
    formData.set("releaseDate", values.releaseDate);
    formData.set("description", values.description);
    formData.set("status", values.status);

    sources.forEach((source) => {
      formData.append("sourceUrl", source.sourceUrl);
      formData.append("sourceProvider", source.provider);
      formData.append("sourceLabel", source.label);
      // Luôn append, kể cả khi rỗng: nếu bỏ qua, mảng `sourceId` bị lệch chỉ
      // số so với `sourceUrl` và id của nguồn này bị gán cho nguồn khác.
      formData.append("sourceId", source.id ?? "");
    });

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

    const msg = result?.success ?? "Đã lưu tập phim thành công.";
    setServerSuccess(msg);
    toast(msg, "success");

    // Reset toàn bộ các ô nhập về trống sau khi thêm hoặc cập nhật
    const nextNum = defaults.id ? initialEpNumber : String((Number(values.episodeNumber) || nextEpisodeNumber) + 1);
    reset({
      episodeNumber: nextNum,
      title: "",
      slug: "",
      releaseDate: "",
      description: "",
      status: "draft",
    });
    setSeasonPart("");
    setEpNumPart("");
    setSubPart("");
    setSlugTouched(false);
    setEpNumTouched(false);
    setSources([{ provider: "youtube", sourceUrl: "", label: "Phần 1 / Nguồn 1" }]);
    router.refresh();
    onSuccess?.();
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

      <section className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-base font-semibold text-parchment-100">Thông tin tập &amp; Phần tập</h3>
          <span className="text-xs text-mist-400">
            Hỗ trợ đặt tên theo Mùa / Tập / Phần (VD: Mùa 4 - Phần 1, Tập 5 - Phần 2)
          </span>
        </div>

        {/* Bộ ghép nhanh Mùa - Tập - Phần */}
        <div className="rounded-lg border border-gold-500/25 bg-ink-900/65 p-3.5">
          <p className="mb-2.5 text-xs font-medium text-gold-200">
            Ghép nhanh Mùa / Tập / Phần (tự động điền Tên tập &amp; Slug):
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <Label htmlFor="quickSeason" className="text-xs text-mist-400">
                Mùa (tuỳ chọn)
              </Label>
              <Input
                id="quickSeason"
                value={seasonPart}
                onChange={(e) => {
                  const v = e.target.value;
                  setSeasonPart(v);
                  applyQuickBuilder(v, epNumPart, subPart);
                }}
                placeholder="VD: 4"
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="quickEpNum" className="text-xs text-mist-400">
                Tập (tuỳ chọn)
              </Label>
              <Input
                id="quickEpNum"
                value={epNumPart}
                onChange={(e) => {
                  const v = e.target.value;
                  setEpNumPart(v);
                  applyQuickBuilder(seasonPart, v, subPart);
                }}
                placeholder="VD: 5"
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="quickSubPart" className="text-xs text-mist-400">
                Phần (tuỳ chọn)
              </Label>
              <Input
                id="quickSubPart"
                value={subPart}
                onChange={(e) => {
                  const v = e.target.value;
                  setSubPart(v);
                  applyQuickBuilder(seasonPart, epNumPart, v);
                }}
                placeholder="VD: 1, 2, Thượng, Hạ"
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="episodeNumber">Thứ tự sắp xếp (STT)</Label>
            <Input
              id="episodeNumber"
              inputMode="numeric"
              placeholder="1"
              {...register("episodeNumber")}
              onChange={(e) => {
                setEpNumTouched(e.target.value.trim().length > 0);
                register("episodeNumber").onChange(e);
              }}
            />
            <p className="text-xs text-mist-400">
              Dùng để sắp xếp thứ tự tập/phần (tự động tăng để không bị trùng khi 1 tập có nhiều phần).
            </p>
            {errors.episodeNumber && (
              <p className="text-xs text-rouge-300">{errors.episodeNumber.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="episodeTitle">Tên tập / Phần hiển thị</Label>
            <Input
              id="episodeTitle"
              placeholder="VD: Mùa 4 - Phần 1 hoặc Tập 5 - Phần 2"
              {...register("title")}
            />
            {errors.title && <p className="text-xs text-rouge-300">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="episodeSlug">Slug tập (tự tạo theo tên tập)</Label>
            <Input
              id="episodeSlug"
              placeholder="tap-1"
              {...register("slug")}
              onChange={(e) => {
                setSlugTouched(e.target.value.trim().length > 0);
                register("slug").onChange(e);
              }}
            />
            {errors.slug && <p className="text-xs text-rouge-300">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="releaseDate">Ngày phát hành</Label>
            <Input id="releaseDate" type="date" {...register("releaseDate")} />
            {errors.releaseDate && (
              <p className="text-xs text-rouge-300">{errors.releaseDate.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="episodeDescription">Mô tả tập</Label>
          <textarea
            id="episodeDescription"
            rows={3}
            className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm leading-relaxed text-parchment-100 placeholder:text-mist-500 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
            placeholder="Tóm tắt nội dung tập…"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-rouge-300">{errors.description.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="episodeStatus">Trạng thái xuất bản</Label>
          <div className="flex flex-wrap items-center gap-4">
            <Select
              value={status}
              onValueChange={(value) => setValue("status", value as "draft" | "published")}
            >
              <SelectTrigger id="episodeStatus" className="sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Bản nháp</SelectItem>
                <SelectItem value="published">Đã xuất bản</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-parchment-300/80">
              Tập chỉ hiện với khách khi cả tập và phim cha đều đã xuất bản.
            </p>
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-base font-semibold text-parchment-100">
            Nguồn video &amp; Các phần trong tập
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addPartSource}>
              <Plus aria-hidden="true" />
              Thêm Phần ({sources.length + 1})
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={addSource}>
              <Plus aria-hidden="true" />
              Thêm nguồn dự phòng
            </Button>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-parchment-300/80">
          Chỉ nhập URL của video. Hệ thống tự sinh khung nhúng chính thức; không dán mã HTML hay
          iframe. {PROVIDER_HINTS.youtube}
        </p>

        {/* Ô dán nhanh nhiều link dự phòng (YouTube + Facebook) cách nhau bởi dấu phẩy hoặc xuống dòng */}
        <div className="rounded-lg border border-gold-500/25 bg-ink-900/60 p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="bulkServerLinks" className="text-xs font-medium text-gold-200">
              Dán nhanh nhiều link Server dự phòng (YouTube + Facebook):
            </Label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleBulkSplitLinks}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Tách thành các Server
            </Button>
          </div>
          <textarea
            id="bulkServerLinks"
            rows={2}
            value={bulkLinks}
            onChange={(e) => setBulkLinks(e.target.value)}
            placeholder="Dán nhiều link YouTube / Facebook cách nhau bởi dấu phẩy (,) hoặc xuống dòng để tự động tách thành Server 1 (Chính), Server 2 (Dự phòng)…"
            className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-xs leading-relaxed text-parchment-100 placeholder:text-mist-500 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
          />
        </div>

        <div className="space-y-4">
          {sources.map((source, index) => (
            <div key={index} className="rounded-md border border-ink-700 bg-ink-900/40 p-4">
              <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
                <div className="space-y-1.5">
                  <Label htmlFor={`source-provider-${index}`}>Nền tảng</Label>
                  <Select
                    value={source.provider}
                    onValueChange={(value) =>
                      updateSource(index, { provider: value as "youtube" | "facebook" })
                    }
                  >
                    <SelectTrigger id={`source-provider-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`source-url-${index}`}>URL video</Label>
                  <Input
                    id={`source-url-${index}`}
                    placeholder="https://www.youtube.com/watch?v=… hoặc link Facebook"
                    value={source.sourceUrl}
                    onChange={(e) => {
                      const nextUrl = e.target.value;
                      const autoProvider: "youtube" | "facebook" =
                        /facebook\.com|fb\.watch/i.test(nextUrl)
                          ? "facebook"
                          : /youtube\.com|youtu\.be/i.test(nextUrl)
                            ? "youtube"
                            : source.provider;
                      updateSource(index, {
                        sourceUrl: nextUrl,
                        provider: autoProvider,
                      });
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor={`source-label-${index}`}>Nhãn nguồn</Label>
                  <Input
                    id={`source-label-${index}`}
                    value={source.label}
                    onChange={(e) => updateSource(index, { label: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPreviewIndex(previewIndex === index ? null : index)}
                    aria-expanded={previewIndex === index}
                  >
                    {previewIndex === index ? "Ẩn xem trước" : "Xem trước"}
                  </Button>
                  {sources.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeSource(index)}
                      title="Bỏ nguồn này"
                    >
                      <Trash2 className="text-rouge-400" aria-hidden="true" />
                      <span className="sr-only">Bỏ nguồn {index + 1}</span>
                    </Button>
                  )}
                </div>
              </div>

              {previewIndex === index && (
                <div className="mt-3">
                  <VideoSourcePreview
                    sourceUrl={source.sourceUrl}
                    provider={source.provider}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={isSubmitting}>{submitLabel}</SubmitButton>
        <span className={cn("text-xs", status === "published" ? "text-jade-300/80" : "text-parchment-300/80")}>
          {status === "published"
            ? "Tập sẽ hiện công khai nếu phim cha đã xuất bản."
            : "Tập được lưu ở trạng thái bản nháp."}
        </span>
      </div>
    </form>
  );
}
