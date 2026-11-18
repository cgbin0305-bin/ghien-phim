"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoPreviewProps {
  /** URL ảnh cần xem trước. */
  url: string;
  className?: string;
}

/**
 * Xem trước ảnh logo trong trang Cài đặt.
 *
 * Mục đích chính là bắt lỗi "URL sai" (404, sai tên file, domain bị chặn)
 * ngay tại chỗ thay vì lên tới trang chủ mới biết logo không hiện.
 */
export function LogoPreview({ url, className }: LogoPreviewProps) {
  const [state, setState] = React.useState<"idle" | "ok" | "error">("idle");

  React.useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setState("idle");
      return;
    }

    let cancelled = false;
    setState("idle");

    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setState("ok");
    };
    probe.onerror = () => {
      if (!cancelled) setState("error");
    };
    probe.src = trimmed;

    return () => {
      cancelled = true;
      probe.src = "";
    };
  }, [url]);

  if (!url.trim()) {
    return (
      <p className={cn("text-xs text-parchment-300/75", className)}>
        Chưa có URL logo. Website sẽ dùng dấu ấn mặc định.
      </p>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-[3px] border border-ink-700 bg-ink-850 p-1">
          {state === "error" ? (
            <span className="text-xs leading-tight text-rouge-300">Lỗi</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url.trim()}
              alt="Xem trước logo"
              className="max-h-full max-w-full object-contain"
              onError={() => setState("error")}
            />
          )}
        </span>
        {state === "ok" && <p className="text-xs text-jade-300">Ảnh tải được.</p>}
        {state === "error" && (
          <p className="text-xs leading-relaxed text-rouge-300">
            Không tải được ảnh. Kiểm tra lại URL (đường dẫn file trên Supabase Storage có đúng tên
            không?).
          </p>
        )}
      </div>
    </div>
  );
}
