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
 * `<Image>` an toàn cho mọi URL ảnh do quản trị viên nhập tay.
 *
 * `next/image` **ném exception** khi `src` trỏ tới hostname không nằm trong
 * `images.remotePatterns`:
 *
 * > Invalid src prop (https://…) on `next/image`, hostname "…" is not
 * > configured under images in your `next.config.js`
 *
 * Lỗi này làm sập cả trang (React error boundary), chứ không phải ảnh hỏng
 * đơn lẻ. Vì URL poster/backdrop/cover nhập tay có thể nằm ở bất kỳ host nào
 * (CDN riêng, GitHub Raw, Imgur…), `SafeImage` kiểm tra host trước:
 *
 *  - host được phép trong `remotePatterns` -> `next/image` (tối ưu AVIF/WebP).
 *  - host lạ -> thẻ `<img>` thuần, không crash.
 *  - đường dẫn nội bộ -> `next/image` (đi qua `images.localPatterns`).
 *
 * Trước khi phân loại, `src` được chuẩn hoá: link **trang quản trị** Supabase
 * (`supabase.com/dashboard/...?preview=file.png`) được chuyển thành URL file
 * công khai thật. Nếu không, ảnh vừa không hiện vừa làm sập trang.
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

  if (kind === "external") {
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
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={onError}
      className={className}
    />
  );
}
