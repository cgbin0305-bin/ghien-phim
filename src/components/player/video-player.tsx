"use client";

import * as React from "react";
import { MotionConfig, motion } from "framer-motion";
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
import { DonateTriggerButton } from "@/components/player/donate-modal";
import { buildEmbedUrl } from "@/lib/video/provider";
import {
  exitFullscreen,
  getFullscreenElement,
  onFullscreenChange,
  requestFullscreen,
} from "@/lib/fullscreen";
import { reportBrokenEpisodeAction } from "@/app/actions/community";
import type { DonateConfig } from "@/config/donateConfig";
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
  /** Cấu hình Donate / Thưởng Linh Thạch đã được chỉnh sửa từ Admin. */
  donateConfig?: DonateConfig;
  /** Chỉ định phần phát ban đầu (0-based, từ ?phan= trên URL). */
  initialPartIndex?: number;
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
  donateConfig,
  initialPartIndex,
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

  const [activeIndex, setActiveIndex] = React.useState(() => {
    if (
      initialPartIndex !== undefined &&
      initialPartIndex >= 0 &&
      initialPartIndex < valid.length
    ) {
      return initialPartIndex;
    }
    return 0;
  });
  const [lightsOff, setLightsOff] = React.useState(false);
  /**
   * Trạng thái toàn màn hình thực tế từ trình duyệt (`fullscreenElement`).
   */
  const [isNativeFullscreen, setIsNativeFullscreen] = React.useState(false);
  /**
   * Fallback toàn màn hình bằng CSS (`fixed inset-0 z-[150] h-[100dvh] w-screen`)
   * dành cho iOS Safari, Chrome iOS và các trình duyệt di động / WebView không hỗ
   * trợ `Element.requestFullscreen()` trên thẻ `<div>`.
   */
  const [isPseudoFullscreen, setIsPseudoFullscreen] = React.useState(false);
  const isExpanded = isNativeFullscreen || isPseudoFullscreen;
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
    if (
      initialPartIndex !== undefined &&
      initialPartIndex >= 0 &&
      initialPartIndex < valid.length
    ) {
      setActiveIndex(initialPartIndex);
      return;
    }
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
  }, [storageKey, valid.length, initialPartIndex]);

  const selectSource = (index: number) => {
    setActiveIndex(index);
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, String(index));
    } catch {
      // Ignore storage failures.
    }
  };

  // "Mở rộng" ưu tiên Fullscreen API chuẩn; nếu thiết bị di động (iOS Safari /
  // in-app WebView) không hỗ trợ hoặc từ chối -> tự động bật fallback toàn màn hình CSS.
  const toggleExpanded = React.useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const unlockOrientation = () => {
      try {
        const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
        orientation?.unlock?.();
      } catch {
        // Bỏ qua nếu trình duyệt không hỗ trợ
      }
    };

    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      unlockOrientation();
      return;
    }

    if (getFullscreenElement()) {
      void exitFullscreen()
        .catch(() => undefined)
        .finally(unlockOrientation);
      return;
    }

    void requestFullscreen(frame)
      .then(() => {
        try {
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            const orientation = screen.orientation as ScreenOrientation & {
              lock?: (mode: string) => Promise<void>;
            };
            void orientation?.lock?.("landscape")?.catch(() => undefined);
          }
        } catch {
          // Bỏ qua nếu trình duyệt không hỗ trợ khoá xoay ngang
        }
      })
      .catch(() => {
        // iOS Safari / Mobile WebView không hỗ trợ requestFullscreen trên <div>
        setIsPseudoFullscreen(true);
      });
  }, [isPseudoFullscreen]);

  /**
   * Đồng bộ `isNativeFullscreen` với trạng thái thực tế của trình duyệt.
   *
   * Nghe tất cả biến thể sự kiện (`fullscreenchange`, `webkitfullscreenchange`,
   * `mozfullscreenchange`, `MSFullscreenChange`) để hoạt động trên cả Safari.
   */
  React.useEffect(() => {
    const sync = () => setIsNativeFullscreen(getFullscreenElement() !== null);

    sync();

    return onFullscreenChange(sync);
  }, []);

  // Khoá cuộn trang & cho phép bấm Escape khi đang ở chế độ toàn màn hình fallback trên mobile.
  React.useEffect(() => {
    if (!isPseudoFullscreen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPseudoFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPseudoFullscreen]);

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
          "cinema-player-frame overflow-hidden bg-black transition-all duration-300",
          isPseudoFullscreen
            ? "fixed inset-0 z-[150] h-[100dvh] w-screen rounded-none border-0"
            : "relative aspect-video w-full rounded-xl border border-gold-500/30 shadow-[0_0_45px_-12px_rgba(212,175,55,0.28),0_20px_50px_-20px_rgba(0,0,0,0.9)]",
          !isPseudoFullscreen && (lightsOff ? "cinema-player-active z-50 border-gold-400/65" : "z-0"),
          isNativeFullscreen && "mx-auto max-w-none",
        )}
      >
        {isExpanded && (
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label="Thoát toàn màn hình"
            className="absolute bottom-4 right-3 z-[160] inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-white/85 bg-gradient-to-r from-gold-400 to-gold-300 px-4 py-2 text-xs font-bold text-ink-950 shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_18px_rgba(212,175,55,0.65)] transition-transform hover:brightness-110 active:scale-95 sm:bottom-5 sm:right-5"
          >
            <Minimize2 className="size-4" aria-hidden="true" />
            <span>Thu nhỏ</span>
          </button>
        )}
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
      <MotionConfig reducedMotion="never">
        <div className="relative z-50 flex flex-col gap-3 rounded-xl border border-ink-700/80 bg-ink-900/85 px-3.5 py-3 backdrop-blur-sm transition-all duration-300 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 pr-1 text-xs font-semibold uppercase tracking-wider text-gold-300/90 sm:text-sm">
              <Server className="size-4 text-gold-400" aria-hidden="true" />
              Đổi Server:
            </span>
            {valid.length === 0 ? (
              <span className="text-sm text-mist-400">Chưa có Server</span>
            ) : (
              valid.map((entry, index) => {
                const isActive = index === activeIndex;
                return (
                  <motion.button
                    key={entry.id}
                    type="button"
                    onClick={() => selectSource(index)}
                    aria-pressed={isActive}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 360, damping: 24 }}
                    className={cn(
                      "group relative inline-flex min-h-10 items-center justify-center overflow-hidden rounded-lg p-[1.5px] text-sm font-semibold transition-shadow duration-300",
                      isActive
                        ? "shadow-[0_0_20px_-2px_rgba(212,175,55,0.65)]"
                        : "hover:shadow-[0_0_20px_-2px_rgba(212,175,55,0.5)]",
                    )}
                  >
                    {/* Hào Quang Kiếm Khí xoay quanh viền khi hover (giống thẻ phim) */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute -inset-full transition-opacity duration-300 animate-border-spin",
                        isActive ? "opacity-90" : "opacity-0 group-hover:opacity-100",
                      )}
                      style={{
                        background: "conic-gradient(transparent 260deg, #D4AF37 360deg)",
                      }}
                    />
                    <span
                      className={cn(
                        "relative z-10 inline-flex min-h-[37px] items-center justify-center rounded-[7px] px-4 py-1.5 transition-colors duration-200",
                        isActive
                          ? "bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 font-bold"
                          : "border border-ink-700 bg-ink-850/95 text-parchment-100 group-hover:border-transparent group-hover:bg-ink-900 group-hover:text-gold-200",
                      )}
                    >
                      {entry.serverName}
                    </span>
                  </motion.button>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => void handleReportBrokenLink()}
              disabled={reporting}
              title="Báo lỗi tập phim / Tự động chuyển sang Server dự phòng"
              className="min-h-10 border border-rouge-500/35 bg-rouge-500/10 px-3.5 text-sm text-rouge-200 hover:border-rouge-400/60 hover:bg-rouge-500/20"
            >
              <Flag className="size-4" aria-hidden="true" />
              <span>Báo lỗi tập phim</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => setReloadKey((k) => k + 1)}
              aria-label="Tải lại"
              title="Tải lại trình phát"
              className="min-h-10 border border-ink-700/80 bg-ink-850/75 px-3.5 text-sm"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              <span>Tải lại</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={toggleExpanded}
              aria-pressed={isExpanded}
              aria-label={isExpanded ? "Thu nhỏ" : "Mở rộng"}
              title={isExpanded ? "Thu nhỏ trình phát" : "Mở rộng trình phát"}
              className="min-h-10 border border-ink-700/80 bg-ink-850/75 px-3.5 text-sm"
            >
              {isExpanded ? (
                <Minimize2 className="size-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="size-4" aria-hidden="true" />
              )}
              <span>{isExpanded ? "Thu nhỏ" : "Mở rộng"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => setLightsOff((v) => !v)}
              aria-pressed={lightsOff}
              aria-label={lightsOff ? "Bật đèn" : "Tắt đèn"}
              title={
                lightsOff
                  ? "Bật đèn — Thoát chế độ Rạp Chiếu Cổ Phong"
                  : "Tắt đèn — Bật chế độ Rạp Chiếu Cổ Phong"
              }
              className={cn(
                "min-h-10 border px-3.5 text-sm transition-all duration-300",
                lightsOff
                  ? "border-gold-400/80 bg-gold-500/20 text-gold-200 shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:bg-gold-500/30"
                  : "border-gold-500/35 bg-ink-850/90 text-gold-200 hover:border-gold-400/70 hover:bg-gold-500/15",
              )}
            >
              <AncientLanternIcon active={lightsOff} />
              <span>
                {lightsOff ? "Bật đèn · Rạp Chiếu" : "Tắt đèn · Rạp Chiếu"}
              </span>
            </Button>

            {active && (
              <Button
                asChild
                variant="outline"
                size="default"
                className="min-h-10 border-gold-500/45 bg-ink-850/90 px-3.5 text-sm text-gold-200 hover:border-gold-400 hover:bg-gold-500/15 hover:text-gold-100"
              >
                <a
                  href={active.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Mở video trực tiếp trên ${active.provider === "facebook" ? "Facebook" : "YouTube"}`}
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  <span>
                    {active.provider === "facebook" ? "Mở trên Facebook" : "Mở trên YouTube"}
                  </span>
                </a>
              </Button>
            )}

            <DonateTriggerButton config={donateConfig} className="h-10 px-4 text-sm" />
          </div>
        </div>
      </MotionConfig>

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
