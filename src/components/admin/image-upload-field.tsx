"use client";

import * as React from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { uploadImageAction } from "@/app/admin/(panel)/media/actions";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

type Registration = Pick<UseFormRegisterReturn, "name" | "onChange" | "onBlur" | "ref">;

interface ImageUploadFieldProps {
  /** Nhãn hiển thị, ví dụ "URL poster (ảnh ngang)". */
  label: string;
  /** Gợi ý về tỷ lệ/kích thước ảnh. */
  hint?: string;
  /** `id` của ô nhập (dùng cho `<label htmlFor>`). */
  id: string;
  /**
   * Props từ `register()` của React Hook Form.
   *
   * Bỏ trống nếu form cha đã có sẵn ô nhập cho field này — khi đó component
   * chỉ hiện nút tải lên, tránh đăng ký trùng một field trong RHF.
   */
  registration?: Registration;
  /** URL hiện tại. */
  value: string;
  /** Được gọi khi upload thành công với URL mới. */
  onUploaded: (url: string) => void;
  /** Lỗi validate từ form cha. */
  error?: string;
  /** Tỉ lệ khung xem trước (width/height). */
  aspect?: "16/9" | "square";  /**
   * `false` khi form cha đã có sẵn ô nhập cho field này — component chỉ hiện
   * nút tải lên và khung xem trước.
   */
  showInput?: boolean;
  className?: string;
}

const ASPECT_CLASS: Record<NonNullable<ImageUploadFieldProps["aspect"]>, string> = {
  "16/9": "aspect-video",
  square: "aspect-square",
};

/**
 * Ô nhập ảnh kèm nút tải lên trực tiếp.
 *
 * Admin thường không biết URL ảnh công khai của file trong Supabase Storage —
 * chỉ biết "trang quản trị" của Supabase. Nút tải lên giải quyết đúng chỗ đó:
 * chọn file, ảnh được upload vào bucket `media`, URL công khai được điền thẳng
 * vào ô. URL kết quả luôn trỏ tới `*.supabase.co` nên `next/image` tối ưu được
 * và không bao giờ gặp lỗi "hostname is not configured".
 */
export function ImageUploadField({
  label,
  hint,
  id,
  registration,
  value,
  onUploaded,
  error,
  aspect = "16/9",
  showInput = true,
  className,
}: ImageUploadFieldProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.set("file", file);

    try {
      const result = await uploadImageAction(formData);
      if (result.error) {
        setUploadError(result.error);
      } else if (result.url) {
        onUploaded(result.url);
      }
    } catch {
      setUploadError("Không tải ảnh lên được. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      // Cho phép chọn lại cùng một file sau khi lỗi.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end gap-3">
        <div
          className={cn(
            "relative w-32 shrink-0 overflow-hidden rounded-md border border-ink-700 bg-ink-850",
            ASPECT_CLASS[aspect],
          )}
        >
          {value ? (
            // `SafeImage` chuẩn hoá URL và tự chọn cách render an toàn, nên
            // khung xem trước hiện đúng cả khi admin dán link trang quản trị
            // Supabase thay vì link file.
            <SafeImage src={value} alt="" fill sizes="128px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-mist-500">
              Chưa có ảnh
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {showInput && (
            <label htmlFor={id} className="block text-sm text-parchment-200">
              {label}
            </label>
          )}

          <div className="flex gap-2">
            {showInput && (
              <input
                id={id}
                type="text"
                // `name` là bắt buộc: React Hook Form đọc `event.target.name`
                // để biết field nào cần cập nhật.
                name={registration?.name}
                value={value}
                onChange={(event) => {
                  // React Hook Form's `onChange` expects the DOM event itself
                  // (it reads `event.target.value`). Passing a raw string here
                  // makes it throw on `event.target`.
                  if (registration) registration.onChange(event);
                  else onUploaded(event.target.value);
                }}
                onBlur={registration?.onBlur}
                ref={registration?.ref}
                placeholder="https://…"
                className="h-10 min-w-0 flex-1 rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-parchment-100 placeholder:text-mist-500 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
            >
              {uploading ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ImageUp aria-hidden="true" />
              )}
              {uploading ? "Đang tải…" : "Tải lên"}
            </Button>
          </div>

          {value && (
            <button
              type="button"
              onClick={() => onUploaded("")}
              className="inline-flex items-center gap-1 text-xs text-parchment-300/80 transition-colors hover:text-rouge-300"
            >
              <X className="size-3" aria-hidden="true" />
              Xoá ảnh
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <p role="alert" className="text-xs text-rouge-300">
          {uploadError}
        </p>
      )}
      {error ? (
        <p className="text-xs text-rouge-300">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-parchment-300/80">{hint}</p>
      ) : null}
    </div>
  );
}
