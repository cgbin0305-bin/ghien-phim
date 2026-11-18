"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** URL ảnh logo (thường trỏ tới Supabase Storage). */
  logoUrl: string | null;
  /** Tên website, dùng cho alt text. */
  siteName: string;
  /** Kích thước khung chứa logo. */
  className?: string;
}

/**
 * Logo của website, hiển thị ở header và footer.
 *
 * - Có `logoUrl` thì render ảnh thật.
 * - Không có, hoặc ảnh lỗi (404, sai tên file, domain bị chặn) thì lùi về con
 *   dấu ấn "閣" để header/footer không bao giờ bị trống.
 *
 * Dùng thẻ `<img>` thay vì `next/image` vì URL logo do quản trị viên nhập tay
 * và có thể trỏ tới bất kỳ host nào. Bộ tối ưu ảnh của Next chỉ chấp nhận
 * domain nằm trong `images.remotePatterns`; nếu dùng `next/image` thì trang sẽ
 * crash với lỗi "Invalid src prop ... hostname is not configured".
 */
export function BrandLogo({ logoUrl, siteName, className }: BrandLogoProps) {
  const [failed, setFailed] = React.useState(false);

  // Reset trạng thái lỗi khi quản trị viên đổi sang URL khác.
  React.useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  if (!logoUrl || failed) {
    return <SealMark className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={`Logo ${siteName}`}
      width={64}
      height={64}
      loading="eager"
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
    />
  );
}

/** A small seal-style mark inspired by a Chinese chop. */
function SealMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[3px] border border-gold-500/45 bg-gold-500/10 font-serif text-base leading-none text-gold-300",
        className,
      )}
    >
      閣
    </span>
  );
}
