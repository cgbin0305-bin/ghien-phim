"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Eye,
  Film,
  Flame,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import {
  MOCK_ANALYTICS_BY_RANGE,
  MOCK_LINK_CHECK_TARGETS,
  runBatchLinkHealthCheck,
  type LinkCheckResult,
  type LinkStatus,
  type MovieAnalytics,
  type TimeRangeKey,
} from "@/config/mockAnalyticsData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIME_RANGES: Array<{ key: TimeRangeKey; label: string }> = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
];

type LinkFilterTab = "all" | "broken" | "manual_check" | "active";

export function AnalyticsDashboard({
  realLinks = [],
}: {
  realLinks?: LinkCheckResult[];
}) {
  const [timeRange, setTimeRange] = React.useState<TimeRangeKey>("7d");
  const stats = MOCK_ANALYTICS_BY_RANGE[timeRange];

  const [selectedMovieId, setSelectedMovieId] = React.useState<string>(
    stats.topMovies[0]?.movieId ?? "",
  );

  // Giữ selectedMovieId hợp lệ khi đổi bộ lọc thời gian
  const selectedMovie: MovieAnalytics | undefined = React.useMemo(
    () =>
      stats.topMovies.find((m) => m.movieId === selectedMovieId) ??
      stats.topMovies[0],
    [stats.topMovies, selectedMovieId],
  );

  // State cho Công Cụ Quét Sức Khỏe Link Tự Động
  const hasRealLinks = realLinks.length > 0;
  const [linkSourceMode, setLinkSourceMode] = React.useState<"real" | "sample">(
    hasRealLinks ? "real" : "sample",
  );
  const [linkResults, setLinkResults] = React.useState<LinkCheckResult[]>(() =>
    hasRealLinks ? realLinks : MOCK_LINK_CHECK_TARGETS,
  );
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanProgress, setScanProgress] = React.useState<{
    completed: number;
    total: number;
    currentLabel: string;
  }>({ completed: 0, total: 0, currentLabel: "" });
  const [filterTab, setFilterTab] = React.useState<LinkFilterTab>("all");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [quickEditId, setQuickEditId] = React.useState<string | null>(null);
  const [quickEditUrl, setQuickEditUrl] = React.useState<string>("");

  const switchLinkSource = (mode: "real" | "sample") => {
    if (isScanning) return;
    setLinkSourceMode(mode);
    setFilterTab("all");
    setScanProgress({ completed: 0, total: 0, currentLabel: "" });
    setLinkResults(mode === "real" && hasRealLinks ? realLinks : MOCK_LINK_CHECK_TARGETS);
  };

  const handleScanAllLinks = async () => {
    if (isScanning || linkResults.length === 0) return;

    const resetTargets: LinkCheckResult[] = linkResults.map((item) => ({
      ...item,
      status: "checking",
      httpCode: null,
      statusMessage: "Đang chờ quét…",
    }));

    setIsScanning(true);
    setLinkResults(resetTargets);
    setScanProgress({
      completed: 0,
      total: resetTargets.length,
      currentLabel: `${resetTargets[0]?.movieTitle ?? ""} · ${resetTargets[0]?.episodeTitle ?? ""}`,
    });

    const isJsdom =
      typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent || "");

    const proxyFetch: typeof fetch = (input, init) => {
      if (isJsdom) {
        return globalThis.fetch(input, init);
      }
      const url = typeof input === "string" ? input : input.toString();
      return globalThis.fetch(`/api/admin/check-link?oembed=${encodeURIComponent(url)}`, init);
    };

    try {
      await runBatchLinkHealthCheck(resetTargets, {
        batchSize: 5,
        fetchImpl: proxyFetch,
        onProgress: ({ completedCount, totalCount, currentBatchResults, allResults }) => {
          const lastItem = currentBatchResults[currentBatchResults.length - 1];
          setLinkResults(allResults);
          setScanProgress({
            completed: completedCount,
            total: totalCount,
            currentLabel: lastItem
              ? `${lastItem.movieTitle} · ${lastItem.episodeTitle}`
              : "",
          });
        },
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Bỏ qua nếu môi trường không có clipboard API
    }
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  const handleSaveQuickEdit = (id: string) => {
    const trimmed = quickEditUrl.trim();
    if (!trimmed) return;
    setLinkResults((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              sourceUrl: trimmed,
              provider: /facebook\.com|fb\.watch/i.test(trimmed) ? "facebook" : "youtube",
              status: "idle",
              httpCode: null,
              statusMessage: "Đã cập nhật link — bấm Quét lại để kiểm tra",
            }
          : item,
      ),
    );
    setQuickEditId(null);
    setQuickEditUrl("");
  };

  const linkCounts = React.useMemo(() => {
    let active = 0;
    let broken = 0;
    let manual = 0;
    for (const item of linkResults) {
      if (item.status === "active") active += 1;
      else if (item.status === "broken") broken += 1;
      else if (item.status === "manual_check") manual += 1;
    }
    return {
      total: linkResults.length,
      active,
      broken,
      manual,
    };
  }, [linkResults]);

  const filteredLinks = React.useMemo(() => {
    if (filterTab === "all") return linkResults;
    return linkResults.filter((item) => item.status === filterTab);
  }, [linkResults, filterTab]);

  const progressPercent =
    scanProgress.total > 0
      ? Math.round((scanProgress.completed / scanProgress.total) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Header + Bộ lọc thời gian */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700/70 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/35 bg-gold-500/10 px-3 py-1 text-xs font-medium text-gold-300">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Trung tâm Giám sát &amp; Phân tích
          </div>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
            Thống Kê Lượt Xem &amp; Sức Khỏe Link
          </h1>
          <p className="mt-1 text-sm text-parchment-300/80">
            Theo dõi hiệu suất lượt xem, chuyển đổi Thưởng Linh Thạch và tự động quét link YouTube/Facebook hỏng.
          </p>
        </div>

        {/* Bộ lọc thời gian: Hôm nay / 7 ngày / 30 ngày */}
        <div
          role="group"
          aria-label="Bộ lọc thời gian thống kê"
          className="inline-flex rounded-lg border border-ink-700 bg-ink-900/90 p-1"
        >
          {TIME_RANGES.map((range) => {
            const active = timeRange === range.key;
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => setTimeRange(range.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
                  active
                    ? "bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 shadow-[0_2px_10px_-2px_rgba(212,175,55,0.45)]"
                    : "text-parchment-300/80 hover:text-parchment-100",
                )}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ===================================================================
          MODULE 1: 4 THẺ KPI CHÍNH & PHÂN TÍCH TRỰC QUAN
          =================================================================== */}
      <section aria-label="Chỉ số tổng quan KPI" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Tổng Lượt Xem"
          value={stats.totalViews.formattedValue}
          changePercent={stats.totalViews.changePercent}
          subLabel={stats.totalViews.subLabel}
          icon={Eye}
        />
        <KpiCard
          title="Khán Giả Hoạt Động"
          value={stats.activeVisitors.formattedValue}
          changePercent={stats.activeVisitors.changePercent}
          subLabel={stats.activeVisitors.subLabel}
          icon={Users}
        />
        <KpiCard
          title="Lượt Bấm Donate"
          value={stats.donateClicks.formattedValue}
          changePercent={stats.donateClicks.changePercent}
          subLabel={stats.donateClicks.subLabel}
          badgeText={`CTR ${stats.donateClicks.ctrPercent.toFixed(2)}%`}
          icon={Coins}
          accentGold
        />
        <KpiCard
          title="Tỷ Lệ Giữ Chân"
          value={stats.retentionRate.formattedValue}
          changePercent={stats.retentionRate.changePercent}
          subLabel={stats.retentionRate.subLabel}
          badgeText={`TB: ${stats.retentionRate.avgStopEpisode}`}
          icon={Activity}
        />
      </section>

      {/* Hàng biểu đồ 1: Xu hướng Lượt xem vs Donate + Top 5 Phim Hiệu Quả Nhất */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Biểu đồ xu hướng Lượt xem vs Lượt bấm Donate */}
        <section className="panel border-gold-500/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-parchment-100">
                <TrendingUp className="size-4 text-gold-300" aria-hidden="true" />
                Xu Hướng Lượt Xem &amp; Lượt Bấm Donate
              </h2>
              <p className="mt-0.5 text-xs text-mist-400">
                So sánh lưu lượng xem tập phim và tương tác mở Popup Thưởng Linh Thạch
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-gold-200">
                <span className="size-2.5 rounded-full bg-gold-400" />
                Lượt xem
              </span>
              <span className="inline-flex items-center gap-1.5 text-jade-200">
                <span className="size-2.5 rounded-full bg-jade-400" />
                Bấm Donate
              </span>
            </div>
          </div>

          <div className="mt-5">
            <ViewsVsDonateTrendChart data={stats.trendSeries} />
          </div>
        </section>

        {/* Top 5 Phim Hiệu Quả Nhất */}
        <section className="panel border-gold-500/25 p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-parchment-100">
                <Flame className="size-4 text-gold-300" aria-hidden="true" />
                Top 5 Phim Hiệu Quả Nhất
              </h2>
              <p className="mt-0.5 text-xs text-mist-400">
                Bấm vào từng phim để xem chi tiết rơi rụng theo tập bên dưới
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ink-700/80 text-mist-400">
                  <th className="pb-2.5 font-medium">#</th>
                  <th className="pb-2.5 font-medium">Bộ phim</th>
                  <th className="pb-2.5 text-right font-medium">Lượt xem</th>
                  <th className="pb-2.5 text-right font-medium">Donate</th>
                  <th className="pb-2.5 text-right font-medium">Giữ chân</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/80">
                {stats.topMovies.slice(0, 5).map((movie, idx) => {
                  const isSelected = selectedMovie?.movieId === movie.movieId;
                  return (
                    <tr
                      key={movie.movieId}
                      onClick={() => setSelectedMovieId(movie.movieId)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected
                          ? "bg-gold-500/12"
                          : "hover:bg-ink-850/80",
                      )}
                    >
                      <td className="py-2.5 pr-2 font-mono font-bold text-gold-300">
                        0{idx + 1}
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-parchment-100 line-clamp-1">
                          {movie.title}
                        </p>
                        <p className="text-xs text-mist-400">{movie.genre}</p>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-parchment-100">
                        {movie.totalViews.toLocaleString("vi-VN")}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-gold-300">
                        {movie.donateClicks.toLocaleString("vi-VN")}
                        <span className="block text-xs text-mist-400">
                          {movie.donateCtr.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge variant={movie.retentionRate >= 72 ? "jade" : "gold"}>
                          {movie.retentionRate.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Hàng biểu đồ 2: Rơi Rụng Theo Tập (Episode Drop-off) + Top Từ Khóa Tìm Kiếm */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
        {/* Biểu đồ Rơi Rụng Theo Tập */}
        <section className="panel border-gold-500/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-parchment-100">
                <BarChart3 className="size-4 text-gold-300" aria-hidden="true" />
                Biểu Đồ Rơi Rụng Theo Tập (Episode Drop-off)
              </h2>
              <p className="mt-0.5 text-xs text-mist-400">
                Phát hiện tập phim có tỷ lệ khán giả bỏ xem cao bất thường để tối ưu nội dung hoặc link
              </p>
            </div>

            <div className="min-w-[220px]">
              <label htmlFor="dropoff-movie-select" className="sr-only">
                Chọn phim phân tích rơi rụng theo tập
              </label>
              <select
                id="dropoff-movie-select"
                value={selectedMovie?.movieId ?? ""}
                onChange={(e) => setSelectedMovieId(e.target.value)}
                className="w-full rounded-md border border-gold-500/40 bg-ink-850 px-3 py-1.5 text-xs font-medium text-parchment-100 focus-visible:border-gold-400 focus-visible:outline-none"
              >
                {stats.topMovies.map((m) => (
                  <option key={m.movieId} value={m.movieId}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedMovie && <EpisodeDropOffChart movie={selectedMovie} />}
        </section>

        {/* Top Từ Khóa Tìm Kiếm */}
        <section className="panel border-gold-500/25 p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-parchment-100">
            <Search className="size-4 text-gold-300" aria-hidden="true" />
            Top Từ Khóa Tìm Kiếm Nhiều Nhất
          </h2>
          <p className="mt-0.5 text-xs text-mist-400">
            Xu hướng tìm kiếm phim và thể loại của khán giả trên Ghiền Phim
          </p>

          <ul className="mt-4 space-y-3">
            {stats.topKeywords.map((kw, index) => {
              const maxCount = stats.topKeywords[0]?.count || 1;
              const widthPercent = Math.max(12, Math.round((kw.count / maxCount) * 100));
              const isPositive = kw.trendPercent >= 0;

              return (
                <li key={kw.keyword} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gold-300">
                        {index + 1}.
                      </span>
                      <span className="truncate font-medium text-parchment-100">
                        {kw.keyword}
                      </span>
                      <Badge variant="muted" className="shrink-0">
                        {kw.category}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 font-mono tabular-nums">
                      <span className="text-parchment-200">
                        {kw.count.toLocaleString("vi-VN")}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center text-xs font-semibold",
                          isPositive ? "text-jade-200" : "text-rouge-300",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {kw.trendPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-850">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-500/80 to-gold-300"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* ===================================================================
          MODULE 2: CÔNG CỤ QUÉT SỨC KHỎE LINK TỰ ĐỘNG (AUTO LINK HEALTH CHECK)
          =================================================================== */}
      <section
        aria-labelledby="link-health-heading"
        className="panel oriental-frame border-gold-500/35 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700/80 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Link2 className="size-5 text-gold-300" aria-hidden="true" />
              <h2
                id="link-health-heading"
                className="font-serif text-xl font-semibold text-gold-200"
              >
                Công Cụ Quét Sức Khỏe Link Tự Động (Auto Link Health Check)
              </h2>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-parchment-300/85">
              Kiểm tra đồng loạt link YouTube qua API YouTube oEmbed (batch 5 link/lần để không nghẽn mạng).
              Link lỗi trả về 401/403/404 được đánh dấu đỏ; link Facebook tự động gắn nhãn Kiểm tra thủ công.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Chuyển nguồn quét: Kho Phim Thật vs Dữ Liệu Mẫu Test */}
            {hasRealLinks && (
              <div
                role="group"
                aria-label="Nguồn danh sách link quét"
                className="inline-flex rounded-lg border border-ink-700 bg-ink-900 p-1"
              >
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => switchLinkSource("real")}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    linkSourceMode === "real"
                      ? "bg-gold-500/20 text-gold-200"
                      : "text-parchment-300/75 hover:text-parchment-100",
                  )}
                >
                  Kho Phim ({realLinks.length})
                </button>
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => switchLinkSource("sample")}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    linkSourceMode === "sample"
                      ? "bg-gold-500/20 text-gold-200"
                      : "text-parchment-300/75 hover:text-parchment-100",
                  )}
                >
                  Link Mẫu Test ({MOCK_LINK_CHECK_TARGETS.length})
                </button>
              </div>
            )}

            <Button
              type="button"
              onClick={() => void handleScanAllLinks()}
              disabled={isScanning || linkResults.length === 0}
              className="border border-gold-400/80 bg-gradient-to-r from-[#b8322b] via-[#c83e37] to-[#9e2b25] text-parchment-100 shadow-[0_0_20px_-4px_rgba(212,175,55,0.5)] hover:border-gold-300 hover:brightness-110"
            >
              {isScanning ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Đang quét ({scanProgress.completed}/{scanProgress.total})…
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Quét Toàn Bộ Link Phim
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Thanh tiến trình Progress Bar khi đang quét hoặc vừa quét xong */}
        {scanProgress.total > 0 && (
          <div className="mt-4 rounded-lg border border-gold-500/30 bg-ink-950/75 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-gold-200">
                {isScanning
                  ? `Đang quét tới: ${scanProgress.completed} / ${scanProgress.total} link — ${scanProgress.currentLabel}`
                  : `Hoàn tất quét ${scanProgress.total} / ${scanProgress.total} link phim`}
              </span>
              <span className="font-mono font-bold text-gold-300">{progressPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-ink-850"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-500 via-gold-300 to-jade-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Bộ lọc nhanh theo trạng thái */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              active={filterTab === "all"}
              onClick={() => setFilterTab("all")}
              label={`Tất cả (${linkCounts.total})`}
            />
            <FilterChip
              active={filterTab === "broken"}
              onClick={() => setFilterTab("broken")}
              label={`Chỉ hiện Link Lỗi (${linkCounts.broken})`}
              tone="rouge"
            />
            <FilterChip
              active={filterTab === "manual_check"}
              onClick={() => setFilterTab("manual_check")}
              label={`Kiểm tra thủ công (${linkCounts.manual})`}
              tone="gold"
            />
            <FilterChip
              active={filterTab === "active"}
              onClick={() => setFilterTab("active")}
              label={`Hoạt động (${linkCounts.active})`}
              tone="jade"
            />
          </div>

          <span className="text-xs text-mist-400">
            Batch size: 5 link / lượt · Nguồn:{" "}
            <strong className="text-parchment-200">
              {linkSourceMode === "real" && hasRealLinks ? "Kho Phim Supabase" : "Bộ dữ liệu mẫu"}
            </strong>
          </span>
        </div>

        {/* Bảng kết quả kiểm tra link */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-ink-800 bg-ink-950/60">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-ink-800 bg-ink-900/80 text-mist-400">
                <th className="px-4 py-3 font-medium">Tên phim</th>
                <th className="px-3 py-3 font-medium">Tập số</th>
                <th className="px-3 py-3 font-medium">Link gốc</th>
                <th className="px-3 py-3 font-medium">Trạng thái / Mã lỗi</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800/75">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-parchment-300/80">
                    {filterTab === "broken"
                      ? "Tuyệt vời! Chưa phát hiện link lỗi nào trong bộ lọc này."
                      : "Không có dữ liệu link phù hợp bộ lọc."}
                  </td>
                </tr>
              ) : (
                filteredLinks.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr
                      className={cn(
                        "transition-colors hover:bg-ink-900/60",
                        item.status === "broken" && "bg-rouge-500/[0.05]",
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-parchment-100">{item.movieTitle}</p>
                        <p className="text-xs text-mist-400">{item.serverLabel}</p>
                      </td>
                      <td className="px-3 py-3 font-medium text-gold-200">
                        Tập {item.episodeNumber}
                        <span className="block max-w-[150px] truncate text-xs text-mist-400">
                          {item.episodeTitle}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.provider === "youtube" ? "rouge" : "gold"}>
                            {item.provider === "youtube" ? "YT" : "FB"}
                          </Badge>
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="max-w-[240px] truncate font-mono text-xs text-parchment-200 underline-offset-4 hover:text-gold-300 hover:underline"
                            title={item.sourceUrl}
                          >
                            {item.sourceUrl}
                          </a>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <LinkStatusBadge
                          status={item.status}
                          httpCode={item.httpCode}
                          message={item.statusMessage}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleCopyUrl(item.id, item.sourceUrl)}
                            title="Copy Link gốc"
                            className="inline-flex items-center gap-1 rounded border border-ink-700 bg-ink-850 px-2.5 py-1 text-xs font-medium text-parchment-200 transition-colors hover:border-gold-500/50 hover:text-gold-200"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="size-3 text-jade-300" aria-hidden="true" />
                                <span className="text-jade-200">Đã copy</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" aria-hidden="true" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Mở link trong tab mới"
                            className="inline-flex items-center gap-1 rounded border border-ink-700 bg-ink-850 px-2.5 py-1 text-xs font-medium text-parchment-200 transition-colors hover:border-gold-500/50 hover:text-gold-200"
                          >
                            <ExternalLink className="size-3" aria-hidden="true" />
                            <span>Mở</span>
                          </a>

                          {linkSourceMode === "real" && hasRealLinks ? (
                            <Link
                              href={`/admin/phim/${item.movieId}/episodes`}
                              className="inline-flex items-center gap-1 rounded border border-gold-500/45 bg-gold-500/15 px-2.5 py-1 text-xs font-semibold text-gold-200 transition-colors hover:bg-gold-500/25"
                            >
                              <Wrench className="size-3" aria-hidden="true" />
                              <span>Sửa nhanh</span>
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickEditId(item.id);
                                setQuickEditUrl(item.sourceUrl);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-gold-500/45 bg-gold-500/15 px-2.5 py-1 text-xs font-semibold text-gold-200 transition-colors hover:bg-gold-500/25"
                            >
                              <Pencil className="size-3" aria-hidden="true" />
                              <span>Sửa nhanh</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Form sửa nhanh inline cho chế độ test mẫu */}
                    {quickEditId === item.id && (
                      <tr className="bg-ink-900/90">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-gold-200">
                              Thay link mới cho {item.movieTitle} · Tập {item.episodeNumber}:
                            </span>
                            <input
                              type="url"
                              value={quickEditUrl}
                              onChange={(e) => setQuickEditUrl(e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="min-w-[260px] flex-1 rounded border border-gold-500/45 bg-ink-950 px-3 py-1.5 text-xs text-parchment-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveQuickEdit(item.id)}
                            >
                              Lưu link mới
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setQuickEditId(null)}
                            >
                              Hủy
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * SUBCOMPONENTS (KPI Card, Trend Chart, Episode Drop-off Chart, Status Badges)
 * ========================================================================== */

function KpiCard({
  title,
  value,
  changePercent,
  subLabel,
  badgeText,
  icon: Icon,
  accentGold = false,
}: {
  title: string;
  value: string;
  changePercent: number;
  subLabel: string;
  badgeText?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentGold?: boolean;
}) {
  const isUp = changePercent >= 0;

  return (
    <div
      className={cn(
        "panel relative overflow-hidden p-4 transition-colors",
        accentGold ? "border-gold-500/45 bg-gold-500/[0.04]" : "border-ink-700/80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-mist-400">
          {title}
        </span>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg border",
            accentGold
              ? "border-gold-400/50 bg-gold-500/15 text-gold-300"
              : "border-ink-700 bg-ink-850 text-gold-300",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
        <span className="font-serif text-3xl font-bold tabular-nums text-parchment-100">
          {value}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
            isUp
              ? "bg-jade-500/15 text-jade-200"
              : "bg-rouge-500/15 text-rouge-300",
          )}
        >
          {isUp ? (
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="size-3.5" aria-hidden="true" />
          )}
          {isUp ? "+" : ""}
          {changePercent.toFixed(1)}%
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-parchment-300/80">{subLabel}</p>
        {badgeText && <Badge variant="gold">{badgeText}</Badge>}
      </div>
    </div>
  );
}

function ViewsVsDonateTrendChart({
  data,
}: {
  data: Array<{ date: string; views: number; donateClicks: number }>;
}) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  if (data.length === 0) return null;

  const width = 620;
  const height = 220;
  const padX = 42;
  const padTop = 20;
  const padBottom = 32;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;

  const maxViews = Math.max(...data.map((d) => d.views), 1);
  const maxDonate = Math.max(...data.map((d) => d.donateClicks), 1);

  const getX = (index: number) =>
    data.length === 1
      ? padX + chartW / 2
      : padX + (index / (data.length - 1)) * chartW;
  const getViewY = (views: number) =>
    padTop + chartH - (views / maxViews) * chartH;
  const getDonateY = (clicks: number) =>
    padTop + chartH - (clicks / maxDonate) * chartH;

  const viewPoints = data.map((d, i) => `${getX(i)},${getViewY(d.views)}`).join(" ");
  const donatePoints = data
    .map((d, i) => `${getX(i)},${getDonateY(d.donateClicks)}`)
    .join(" ");

  const viewAreaPath = `M ${getX(0)},${padTop + chartH} L ${data
    .map((d, i) => `${getX(i)},${getViewY(d.views)}`)
    .join(" L ")} L ${getX(data.length - 1)},${padTop + chartH} Z`;

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1];

  return (
    <div className="space-y-3">
      {/* Thanh tóm tắt điểm đang hover */}
      {activePoint && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink-800 bg-ink-950/70 px-3 py-2 text-xs">
          <span className="font-semibold text-parchment-100">
            Mốc thời gian: <span className="text-gold-300">{activePoint.date}</span>
          </span>
          <div className="flex items-center gap-4 font-mono">
            <span className="text-gold-200">
              Lượt xem: <strong>{activePoint.views.toLocaleString("vi-VN")}</strong>
            </span>
            <span className="text-jade-200">
              Donate: <strong>{activePoint.donateClicks.toLocaleString("vi-VN")}</strong>
            </span>
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full overflow-visible"
        role="img"
        aria-label="Biểu đồ xu hướng Lượt xem và Lượt bấm Donate"
      >
        <defs>
          <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Đường lưới ngang */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padTop + chartH * (1 - ratio);
          return (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="rgba(148, 163, 184, 0.14)"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Vùng đổ bóng dưới đường Lượt xem */}
        <path d={viewAreaPath} fill="url(#goldAreaGrad)" />

        {/* Đường Lượt xem (Vàng kim #D4AF37) */}
        <polyline
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={viewPoints}
        />

        {/* Đường Lượt bấm Donate (Ngọc bích #34d399) */}
        <polyline
          fill="none"
          stroke="#34d399"
          strokeWidth="2.4"
          strokeDasharray="5 3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={donatePoints}
        />

        {/* Điểm dữ liệu & Nhãn trục X */}
        {data.map((d, i) => {
          const x = getX(i);
          const yView = getViewY(d.views);
          const yDonate = getDonateY(d.donateClicks);
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={d.date}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {isHovered && (
                <line
                  x1={x}
                  x2={x}
                  y1={padTop}
                  y2={padTop + chartH}
                  stroke="rgba(212, 175, 55, 0.4)"
                  strokeWidth="1.2"
                />
              )}
              <circle
                cx={x}
                cy={yView}
                r={isHovered ? 5.5 : 3.8}
                fill="#D4AF37"
                stroke="#0a0e14"
                strokeWidth="1.5"
              />
              <circle
                cx={x}
                cy={yDonate}
                r={isHovered ? 5 : 3.4}
                fill="#34d399"
                stroke="#0a0e14"
                strokeWidth="1.5"
              />
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="12"
              >
                {d.date}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EpisodeDropOffChart({ movie }: { movie: MovieAnalytics }) {
  const episodes = movie.episodeDropOff;
  const maxViews = Math.max(...episodes.map((e) => e.views), 1);

  // Tìm tập có % rơi rụng cao nhất để cảnh báo
  const worstEpisode = episodes.reduce(
    (worst, cur) => (cur.dropOffPercent > worst.dropOffPercent ? cur : worst),
    episodes[0]!,
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink-800 bg-ink-950/70 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Film className="size-4 text-gold-300" aria-hidden="true" />
          <span className="font-semibold text-parchment-100">{movie.title}</span>
          <span className="text-mist-400">({movie.totalEpisodes} tập)</span>
        </div>
        {worstEpisode && worstEpisode.dropOffPercent > 0 && (
          <span className="inline-flex items-center gap-1.5 text-rouge-300">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            Rơi rụng cao nhất: <strong>Tập {worstEpisode.episodeNumber}</strong> (-
            {worstEpisode.dropOffPercent}%)
          </span>
        )}
      </div>

      {/* Biểu đồ cột theo tập */}
      <div className="flex h-52 items-end gap-2 overflow-x-auto rounded-lg border border-ink-800/80 bg-ink-950/50 px-4 pb-3 pt-8">
        {episodes.map((ep) => {
          const heightPct = Math.max(10, Math.round((ep.views / maxViews) * 100));
          const isWorst =
            worstEpisode &&
            ep.episodeNumber === worstEpisode.episodeNumber &&
            ep.dropOffPercent >= 12;

          return (
            <div
              key={ep.episodeNumber}
              className="group relative flex min-w-[36px] flex-1 flex-col items-center justify-end gap-1.5 h-full"
              title={`${ep.episodeTitle}: ${ep.views.toLocaleString("vi-VN")} lượt xem (Rơi rụng: ${ep.dropOffPercent}%)`}
            >
              <span className="font-mono text-xs text-parchment-200 opacity-85 group-hover:opacity-100">
                {ep.views >= 1000 ? `${(ep.views / 1000).toFixed(1)}k` : ep.views}
              </span>
              <div
                className={cn(
                  "w-full max-w-[34px] rounded-t-md transition-all duration-300 group-hover:brightness-115",
                  isWorst
                    ? "bg-gradient-to-t from-rouge-600 to-rouge-400 shadow-[0_0_16px_-2px_rgba(220,38,38,0.5)]"
                    : "bg-gradient-to-t from-gold-500/70 to-gold-300",
                )}
                style={{ height: `${heightPct}%` }}
              />
              <span
                className={cn(
                  "font-mono text-xs font-medium",
                  isWorst ? "text-rouge-300" : "text-mist-400",
                )}
              >
                T{ep.episodeNumber}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "default" | "rouge" | "gold" | "jade";
}) {
  const toneActive = {
    default: "border-gold-400 bg-gold-500/20 text-gold-200",
    rouge: "border-rouge-400 bg-rouge-500/20 text-rouge-200",
    gold: "border-gold-400 bg-gold-500/20 text-gold-200",
    jade: "border-jade-400 bg-jade-500/20 text-jade-100",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? toneActive
          : "border-ink-700 bg-ink-900 text-parchment-300/80 hover:border-ink-600 hover:text-parchment-100",
      )}
    >
      {label}
    </button>
  );
}

function LinkStatusBadge({
  status,
  httpCode,
  message,
}: {
  status: LinkStatus;
  httpCode: number | null;
  message: string;
}) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-jade-500/45 bg-jade-500/15 px-2.5 py-0.5 text-xs font-semibold text-jade-200">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Hoạt động ({httpCode ?? 200})
      </span>
    );
  }

  if (status === "broken") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-rouge-500/50 bg-rouge-500/15 px-2.5 py-0.5 text-xs font-semibold text-rouge-300"
        title={message}
      >
        <ShieldAlert className="size-3.5" aria-hidden="true" />
        {message}
      </span>
    );
  }

  if (status === "manual_check") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/50 bg-gold-500/15 px-2.5 py-0.5 text-xs font-semibold text-gold-200"
        title={message}
      >
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        Facebook · Kiểm tra thủ công
      </span>
    );
  }

  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/35 bg-gold-500/10 px-2.5 py-0.5 text-xs font-medium text-gold-300">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Đang kiểm tra…
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-850 px-2.5 py-0.5 text-xs text-mist-400">
      Chưa quét
    </span>
  );
}
