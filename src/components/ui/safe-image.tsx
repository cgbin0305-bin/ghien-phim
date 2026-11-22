"use client";

import * as React from "react";
import Image from "next/image";
import { classifyImageSource, normalizeImageUrl } from "@/lib/image-hosts";

interface SafeImageProps {
  src: string;
  alt: string;
  /** Bắt buộc khi dùng chế độ `fill`. */
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  onError?: () => void;
}

/**
 * `<Image>` an toàn cho mọi URL ảnh do quản trị viên nhập tay hoặc tải lên.
 *
 * - URL ngoài (`external`): render thẻ `<img>` thuần để không crash `next/image`.
 * - URL Supabase Storage (`remote`): dùng `unoptimized` để tải thẳng từ CDN
 *   Supabase (tránh lỗi 402/502 hoặc timeout từ bộ tối ưu `/_next/image`), kèm
 *   tự động fallback sang `<img>` thuần nếu có lỗi phát sinh.
 * - Đường dẫn nội bộ (`local`): đi qua `next/image` như bình thường.
 */
export function SafeImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  priority,
  className,
  onError,
}: SafeImageProps) {
  const normalized = normalizeImageUrl(src);
  const kind = classifyImageSource(normalized);
  const [fallbackDirect, setFallbackDirect] = React.useState(false);

  React.useEffect(() => {
    setFallbackDirect(false);
  }, [normalized]);

  if (kind === "external" || fallbackDirect) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalized}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onError={onError}
        className={className}
        style={fill ? { width: "100%", height: "100%", objectFit: "cover" } : undefined}
      />
    );
  }

  return (
    <Image
      src={normalized}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      priority={priority}
      unoptimized={kind === "remote"}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => {
        setFallbackDirect(true);
        onError?.();
      }}
      className={className}
    />
  );
}
