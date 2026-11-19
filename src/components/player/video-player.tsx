"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Flag,
  Maximize2,
  Minimize2,
  RefreshCw,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CinemaPlayerWrapper } from "@/components/player/cinema-player-wrapper";
import { buildEmbedUrl } from "@/lib/video/provider";
import {
  exitFullscreen,
  getFullscreenElement,
  onFullscreenChange,
  requestFullscreen,
} from "@/lib/fullscreen";
import { reportBrokenEpisodeAction } from "@/app/actions/community";
import type { VideoSource } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  sources: VideoSource[];
  title: string;
  /** Persist the currently selected source index for this episode. */
  storageKey?: string;
  /** Thông tin ngữ cảnh tập phim để phục vụ nút Báo Lỗi 1-Click. */
  movieId?: string;
  episodeId?: string;
  movieSlug?: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeTitle?: string;
}

interface EmbedState {
  src: string;
  canonicalUrl: string;
  provider: "youtube" | "facebook";
}

interface NormalizedServerEntry {
  id: string;
  serverName: string;
  source: VideoSource;
  embed: NonNullable<ReturnType<typeof buildEmbedUrl>>;
}

const REPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 giờ

function formatServerName(
  rawLabel: string,
  index: number,
  total: number,
  provider: "youtube" | "facebook",
): string {
  const providerTag = provider === "youtube" ? "YT" : "FB";
  const trimmed = rawLabel.trim();

  // Nếu Admin đặt tên theo Phần (ví dụ: Phần 1, Phần 2), giữ rõ tên Phần kèm nhãn Server
  if (/^phần\s*\d+/i.test(trimmed)) {
    return `${trimmed} · ${providerTag}`;
  }

  // Nếu đã có chữ Server trong nhãn
  if (/server/i.test(trimmed)) {
    return trimmed.includes(providerTag) ? trimmed : `${trimmed} (${providerTag})`;
  }

  if (index === 0) {
    return total > 1
      ? `Server 1 (Chính · ${providerTag})`
      : `Server 1 (${trimmed || providerTag})`;
  }

  return `Server ${index + 1} (Dự phòng ${providerTag})`;
}

export function VideoPlayer({
  sources,
  title,
  storageKey,
  movieId,
  episodeId,
  movieSlug,
  movieTitle,
  episodeSlug,
  episodeTitle,
}: VideoPlayerProps) {
  // Hỗ trợ tách linh hoạt nhiều link trong cùng 1 trường sourceUrl (ngăn cách bởi dấu phẩy `,` hoặc xuống dòng `\n`)
  const valid = React.useMemo<NormalizedServerEntry[]>(() => {
    const rawEntries: Array<{
      id: string;
      label: string;
      source: VideoSource;
      embed: NonNullable<ReturnType<typeof buildEmbedUrl>>;
    }> = [];

    for (const source of sources) {
      const splitUrls = source.sourceUrl
        .split(/[\r\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean);

      for (let i = 0; i < splitUrls.length; i += 1) {
        const url = splitUrls[i]!;
        const embed = buildEmbedUrl(url);
        if (!embed) continue;

        const subLabel =
          splitUrls.length > 1
            ? `${source.label || "Server"} #${i + 1}`
            : source.label;

        rawEntries.push({
          id: splitUrls.length > 1 ? `${source.id}-${i}` : source.id,
          label: subLabel,
          source: {
            ...source,
            sourceUrl: url,
            provider: embed.provider,
          },
          embed,
        });
      }
    }

    return rawEntries.map((item, idx) => ({
      id: item.id,
      serverName: formatServerName(
        item.label,
        idx,
        rawEntries.length,
        item.embed.provider,
      ),
      source: item.source,
      embed: item.embed,
    }));
  }, [sources]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [lightsOff, setLightsOff] = React.useState(false);
  /**
   * Trạng thái toàn màn hình.
   *
   * KHÔNG bao giờ set thủ công khi bấm nút: state này luôn được suy ra từ
   * `document.fullscreenElement`. Nhờ vậy, khi người dùng bấm `ESC` (hoặc
   * trình duyệt tự thoát fullscreen), nút bấm cũng cập nhật đúng theo — trước
   * đây state nội bộ và thực tế lệch nhau.
   */
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [reportBanner, setReportBanner] = React.useState<{
    type: "switched" | "reported" | "cooldown";
    text: string;
  } | null>(null);
  const [reporting, setReporting] = React.useState(false);
  const frameRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setIframeLoaded(false);
  }, [activeIndex, reloadKey]);

  React.useEffect(() => {
    if (!storageKey || valid.length === 0) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === null) return;
      const index = Number(stored);
      if (Number.isInteger(index) && index >= 0 && index < valid.length) {
        setActiveIndex(index);
      }
    } catch {
      // Ignore storage failures.
    }
  }, [storageKey, valid.length]);

  const selectSource = (index: number) => {
    setActiveIndex(index);
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, String(index));
    } catch {
      // Ignore storage failures.
    }
  };

  // "Mở rộng" dùng Fullscreen API trên đúng khung phát.
  const toggleExpanded = React.useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;

    // Quyết định vào/ra dựa trên trạng thái thực tế của trình duyệt, không
    // dựa vào state — tránh lệch khi người dùng đã thoát fullscreen bằng ESC.
    if (getFullscreenElement()) {
      void exitFullscreen().catch(() => undefined);
      return;
    }

    void requestFullscreen(frame).catch(() => undefined);
  }, []);

  /**
   * Đồng bộ `isFullscreen` với trạng thái thực tế của trình duyệt.
   *
   * Nghe tất cả biến thể sự kiện (`fullscreenchange`, `webkitfullscreenchange`,
   * `mozfullscreenchange`, `MSFullscreenChange`) để hoạt động trên cả Safari.
   */
  React.useEffect(() => {
    const sync = () => setIsFullscreen(getFullscreenElement() !== null);

    // Đồng bộ ngay khi mount (ví dụ người dùng F11 hoặc mở lại tab đang
    // fullscreen) để không có khoảng thời gian giao diện bị lệch.
    sync();

    return onFullscreenChange(sync);
  }, []);

  // Thoát chế độ tắt đèn bằng Escape và phát tín hiệu cho AmbientParticles tạm dừng.
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.cinemaMode = lightsOff ? "on" : "off";
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("gheienphim:cinema-mode", { detail: { lightsOff } }),
      );
    }

    if (!lightsOff) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightsOff(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightsOff]);

  // Nút "Báo lỗi tập phim" (1-Click Broken Link Report):
  // 1. Nếu có Server dự phòng -> tự động chuyển ngay sang Server dự phòng tiếp theo.
  // 2. Chống spam bằng localStorage (1 lần / tập / 24h).
  // 3. Gửi thông báo ngầm lên Supabase / Admin Dashboard.
  async function handleReportBrokenLink() {
    if (reporting) return;
    setReporting(true);

    const currentServer = valid[activeIndex];
    let switchedMessage = "";

    if (valid.length > 1) {
      const nextIndex = (activeIndex + 1) % valid.length;
      const nextServer = valid[nextIndex];
      selectSource(nextIndex);
      switchedMessage = ` Đã tự động chuyển sang ${nextServer?.serverName ?? `Server ${nextIndex + 1}`} cho đạo hữu!`;
    }

    const reportKey = `gheienphim.broken-report.${movieSlug ?? "movie"}.${episodeSlug ?? title}`;
    let withinCooldown = false;

    try {
      const lastReportedAt = Number(window.localStorage.getItem(reportKey) || "0");
      if (lastReportedAt > 0 && Date.now() - lastReportedAt < REPORT_COOLDOWN_MS) {
        withinCooldown = true;
      } else {
        window.localStorage.setItem(reportKey, String(Date.now()));
      }
    } catch {
      // Ignore storage failures.
    }

    if (withinCooldown) {
      setReportBanner({
        type: valid.length > 1 ? "switched" : "cooldown",
        text:
          valid.length > 1
            ? `Tập này đã được đạo hữu báo lỗi trong 24h qua.${switchedMessage}`
            : "Đạo hữu đã gửi báo lỗi cho tập này trong 24h qua. Quản trị viên đang kiểm tra và cập nhật link mới!",
      });
      setReporting(false);
      return;
    }

    setReportBanner({
      type: valid.length > 1 ? "switched" : "reported",
      text:
        valid.length > 1
          ? `Đã ghi nhận báo lỗi tại ${currentServer?.serverName ?? "nguồn hiện tại"}.${switchedMessage}`
          : "Đã gửi báo lỗi tập phim tới Quản trị viên. Link dự phòng sẽ sớm được cập nhật!",
    });

    try {
      await reportBrokenEpisodeAction({
        movieId: movieId ?? "",
        episodeId: episodeId ?? "",
        movieSlug: movieSlug ?? "",
        movieTitle: movieTitle ?? title,
        episodeSlug: episodeSlug ?? "",
        episodeTitle: episodeTitle ?? title,
        serverLabel: currentServer?.serverName ?? "Server 1",
        note: `Báo lỗi từ trình phát (${currentServer?.embed.provider ?? "unknown"})`,
      });
    } catch {
      // Graceful fallback
    } finally {
      setReporting(false);
    }
  }

  const active: EmbedState | null = valid[activeIndex]
    ? {
        src: valid[activeIndex]!.embed.embedUrl,
        canonicalUrl: valid[activeIndex]!.embed.canonicalUrl,
        provider: valid[activeIndex]!.embed.provider,
      }
    : null;

  return (
    <CinemaPlayerWrapper isDimmed={lightsOff} onDimmedChange={setLightsOff}>
      <div
        ref={frameRef}
        style={{
          transition: "all 0.4s ease",
          boxShadow: lightsOff
            ? "0 0 60px rgba(212, 175, 55, 0.25), 0 0 110px rgba(200, 62, 55, 0.18)"
            : undefined,
        }}
        className={cn(
          "cinema-player-frame relative aspect-video w-full overflow-hidden rounded-xl border border-gold-500/30 bg-black shadow-[0_0_45px_-12px_rgba(212,175,55,0.28),0_20px_50px_-20px_rgba(0,0,0,0.9)]",
          lightsOff
            ? "cinema-player-active z-50 border-gold-400/65"
            : "z-0",
          isFullscreen && "mx-auto max-w-none",
        )}
      >
        {active && !iframeLoaded && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden bg-ink-900/90"
          >
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gold-400/15 to-transparent" />
          </div>
        )}
        {active ? (
          <iframe
            key={`${active.src}-${reloadKey}`}
            src={active.src}
            title={`${title} — ${active.provider === "youtube" ? "YouTube" : "Facebook"}`}
            className="absolute inset-0 size-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
            onLoad={() => setIframeLoaded(true)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <AlertTriangle className="mx-auto size-8 text-gold-300" aria-hidden="true" />
              <p className="font-serif text-lg text-parchment-100">
                Chưa có nguồn video hợp lệ
              </p>
              <p className="text-sm leading-relaxed text-parchment-300/85">
                Tập này chưa được gán nguồn phát. Vui lòng thử lại sau, hoặc chọn nguồn khác nếu có.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Thanh điều khiển Đa Server (Multi-Source Switcher) & Công cụ Trình phát */}
      <div className="relative z-50 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-700/80 bg-ink-900/85 px-3 py-2.5 backdrop-blur-sm transition-all duration-300">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 pr-1 text-xs font-medium uppercase tracking-wider text-gold-300/90">
            <Server className="size-3.5 text-gold-400" aria-hidden="true" />
            Đổi Server:
          </span>
          {valid.length === 0 ? (
            <span className="text-xs text-mist-400">Chưa có Server</span>
          ) : (
            valid.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => selectSource(index)}
                aria-pressed={index === activeIndex}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  index === activeIndex
                    ? "border-gold-400/75 bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 font-semibold shadow-[0_2px_12px_-2px_rgba(212,175,55,0.5)]"
                    : "border-ink-700 bg-ink-850/85 text-parchment-200 hover:border-gold-500/45 hover:text-gold-200",
                )}
              >
                {entry.serverName}
              </button>
            ))
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleReportBrokenLink()}
            disabled={reporting}
            title="Báo lỗi tập phim / Tự động chuyển sang Server dự phòng"
            className="border border-rouge-500/35 bg-rouge-500/10 text-rouge-200 hover:border-rouge-400/60 hover:bg-rouge-500/20"
          >
            <Flag className="size-3.5" aria-hidden="true" />
            <span>Báo lỗi tập phim</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setReloadKey((k) => k + 1)}
            title="Tải lại trình phát"
          >
            <RefreshCw aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Tải lại</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            aria-pressed={isFullscreen}
            title={isFullscreen ? "Thu nhỏ trình phát" : "Mở rộng trình phát"}
          >
            {isFullscreen ? (
              <Minimize2 aria-hidden="true" />
            ) : (
              <Maximize2 aria-hidden="true" />
            )}
            <span className="sr-only sm:not-sr-only">
              {isFullscreen ? "Thu nhỏ" : "Mở rộng"}
            </span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLightsOff((v) => !v)}
            aria-pressed={lightsOff}
            aria-label={lightsOff ? "Bật đèn" : "Tắt đèn"}
            title={
              lightsOff
                ? "Bật đèn — Thoát chế độ Rạp Chiếu Cổ Phong"
                : "Tắt đèn — Bật chế độ Rạp Chiếu Cổ Phong"
            }
            className={cn(
              "border transition-all duration-300",
              lightsOff
                ? "border-gold-400/80 bg-gold-500/20 text-gold-200 shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:bg-gold-500/30"
                : "border-gold-500/35 bg-ink-850/90 text-gold-200 hover:border-gold-400/70 hover:bg-gold-500/15",
            )}
          >
            <AncientLanternIcon active={lightsOff} />
            <span className="sr-only sm:not-sr-only">
              {lightsOff ? "Bật đèn · Rạp Chiếu" : "Tắt đèn · Rạp Chiếu"}
            </span>
          </Button>
        </div>
      </div>

      {/* Thông báo phản hồi tức thì khi bấm Báo lỗi tập phim */}
      {reportBanner && (
        <div
          role="status"
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-xs animate-fade-in",
            reportBanner.type === "switched"
              ? "border-gold-400/50 bg-gold-500/12 text-gold-200"
              : reportBanner.type === "reported"
                ? "border-jade-500/45 bg-jade-500/12 text-jade-100"
                : "border-ink-600 bg-ink-850 text-parchment-200",
          )}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-gold-300" aria-hidden="true" />
            <span>{reportBanner.text}</span>
          </span>
          <button
            type="button"
            onClick={() => setReportBanner(null)}
            className="shrink-0 text-xs underline opacity-80 hover:opacity-100"
          >
            Đóng
          </button>
        </div>
      )}

      {active && (
        <p className="text-xs leading-relaxed text-mist-500">
          Nếu trình phát báo lỗi, hãy bấm <strong>Báo lỗi tập phim</strong> để tự động chuyển sang Server dự phòng hoặc{" "}
          <a
            href={active.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gold-300/85 underline-offset-4 hover:underline"
          >
            mở video trên nền tảng gốc
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
          .
        </p>
      )}
    </CinemaPlayerWrapper>
  );
}

/**
 * Biểu tượng Đèn Lồng Cổ Phong (Ancient Chinese Lantern) cho nút công tắc Rạp Chiếu / Tắt Đèn.
 */
function AncientLanternIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 transition-transform duration-300",
        active && "lantern-active-icon scale-110",
      )}
    >
      <path d="M12 2V4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 4.5H15" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse
        cx="12"
        cy="11.5"
        rx="6.2"
        ry="6.5"
        fill={active ? "rgba(212, 175, 55, 0.28)" : "rgba(200, 62, 55, 0.22)"}
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 5C9.8 7 9.8 16 12 18M12 5C14.2 7 14.2 16 12 18"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeOpacity="0.65"
      />
      <path d="M9 18.2H15" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M10.5 18.5V21.5M12 18.5V22.2M13.5 18.5V21.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
