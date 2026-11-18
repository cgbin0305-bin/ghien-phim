"use client";

import * as React from "react";
import { AlertTriangle, ExternalLink, PlayCircle } from "lucide-react";
import { buildEmbedUrl, parseVideoUrl, providerLabel } from "@/lib/video/provider";
import { cn } from "@/lib/utils";

/**
 * Live preview of a video source.
 *
 * The preview only renders an embed URL produced by the provider layer from a
 * validated input - the raw admin string is never used as an iframe `src`.
 * When the URL cannot be validated we explain why instead of rendering a
 * broken frame.
 */
export function VideoSourcePreview({
  sourceUrl,
  provider,
}: {
  sourceUrl: string;
  provider?: string;
}) {
  const parsed = React.useMemo(() => parseVideoUrl(sourceUrl), [sourceUrl]);

  if (!sourceUrl.trim()) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-ink-600 bg-ink-900/60 px-4 text-center text-xs text-mist-500">
        Nhập URL video hợp lệ để xem bản xem trước.
      </div>
    );
  }

  if (!parsed.ok) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-md border border-rouge-500/40 bg-rouge-500/[0.07] px-4 text-center">
        <AlertTriangle className="size-5 text-rouge-400" aria-hidden="true" />
        <p className="text-xs font-medium text-rouge-200">{parsed.error}</p>
        {parsed.hint && <p className="text-xs leading-relaxed text-rouge-200/70">{parsed.hint}</p>}
      </div>
    );
  }

  const embed = buildEmbedUrl(sourceUrl);
  if (!embed) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-ink-600 bg-ink-900/60 px-4 text-center text-xs text-mist-500">
        Không dựng được khung xem trước cho URL này.
      </div>
    );
  }

  const detected = providerLabel(parsed.video.provider);
  const mismatch = provider && provider !== parsed.video.provider;

  return (
    <div className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-md border border-ink-700 bg-black">
        <iframe
          src={embed.embedUrl}
          title={`Xem trước video ${detected}`}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 size-full border-0"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm px-2 py-1",
            mismatch
              ? "bg-rouge-500/12 text-rouge-300"
              : "bg-jade-500/12 text-jade-100",
          )}
        >
          <PlayCircle className="size-3" aria-hidden="true" />
          {mismatch
            ? `URL thuộc ${detected}, khác với lựa chọn (${providerLabel(provider as never)})`
            : `Phát hiện: ${detected}`}
        </span>
        <a
          href={embed.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-gold-300/80 transition-colors hover:text-gold-200"
        >
          Mở trên {detected}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
