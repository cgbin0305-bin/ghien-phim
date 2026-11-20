// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import {
  MOCK_LINK_CHECK_TARGETS,
  checkSingleLinkHealth,
  runBatchLinkHealthCheck,
} from "@/config/mockAnalyticsData";

describe("AnalyticsDashboard & Auto Link Health Check", () => {
  it("hiển thị đủ 4 thẻ KPI và đổi dữ liệu theo bộ lọc Hôm nay / 7 ngày / 30 ngày", () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByText("Tổng Lượt Xem")).toBeInTheDocument();
    expect(screen.getByText("Khán Giả Hoạt Động")).toBeInTheDocument();
    expect(screen.getByText("Lượt Bấm Donate")).toBeInTheDocument();
    expect(screen.getByText("Tỷ Lệ Giữ Chân")).toBeInTheDocument();

    // Mặc định 7 ngày
    expect(screen.getByText("167.700")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hôm nay" }));
    expect(screen.getByText("24.890")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "30 ngày" }));
    expect(screen.getByText("642.800")).toBeInTheDocument();
  });

  it("hiển thị Top 5 Phim, Biểu đồ Rơi Rụng Theo Tập và Top Từ Khóa Tìm Kiếm", () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByText("Top 5 Phim Hiệu Quả Nhất")).toBeInTheDocument();
    expect(screen.getByText("Biểu Đồ Rơi Rụng Theo Tập (Episode Drop-off)")).toBeInTheDocument();
    expect(screen.getByText("Top Từ Khóa Tìm Kiếm Nhiều Nhất")).toBeInTheDocument();

    const select = screen.getByLabelText("Chọn phim phân tích rơi rụng theo tập");
    fireEvent.change(select, { target: { value: "m-van-kiem-lam-ngo" } });
    expect(screen.getByText(/Rơi rụng cao nhất:/)).toBeInTheDocument();
  });

  it("checkSingleLinkHealth phân loại đúng YouTube 200 OK, 404/403 Broken và Facebook Manual Check", async () => {
    const okFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;
    const brokenFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    const errFetch = vi.fn().mockRejectedValue(new Error("Network down")) as unknown as typeof fetch;

    const ytTarget = MOCK_LINK_CHECK_TARGETS[0]!;
    const fbTarget = MOCK_LINK_CHECK_TARGETS.find((t) => t.provider === "facebook")!;

    const resOk = await checkSingleLinkHealth(ytTarget, okFetch);
    expect(resOk.status).toBe("active");
    expect(resOk.httpCode).toBe(200);

    const res404 = await checkSingleLinkHealth(ytTarget, brokenFetch);
    expect(res404.status).toBe("broken");
    expect(res404.httpCode).toBe(404);

    const resNetErr = await checkSingleLinkHealth(ytTarget, errFetch);
    expect(resNetErr.status).toBe("broken");

    const resFb = await checkSingleLinkHealth(fbTarget, okFetch);
    expect(resFb.status).toBe("manual_check");
  });

  it("runBatchLinkHealthCheck chạy theo batch 5 link/lần và báo tiến trình đầy đủ", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("00000000000") || url.includes("broken") || url.includes("ZZZZ")) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve({ ok: true, status: 200 });
    }) as unknown as typeof fetch;

    const progressUpdates: number[] = [];
    const results = await runBatchLinkHealthCheck(MOCK_LINK_CHECK_TARGETS, {
      batchSize: 5,
      fetchImpl: mockFetch,
      onProgress: ({ completedCount }) => {
        progressUpdates.push(completedCount);
      },
    });

    // 9 link với batch 5 -> tiến trình cập nhật 2 đợt: [5, 9]
    expect(progressUpdates).toEqual([5, 9]);
    expect(results.filter((r) => r.status === "active")).toHaveLength(4);
    expect(results.filter((r) => r.status === "broken")).toHaveLength(3);
    expect(results.filter((r) => r.status === "manual_check")).toHaveLength(2);
  });

  it("nút Quét Toàn Bộ Link Phim chạy quét, hiện Progress Bar và lọc nhanh Link Lỗi", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("00000000000") || url.includes("broken") || url.includes("ZZZZ")) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve({ ok: true, status: 200 });
    }) as unknown as typeof fetch;

    try {
      render(<AnalyticsDashboard />);

      const scanBtn = screen.getByRole("button", { name: /Quét Toàn Bộ Link Phim/i });
      fireEvent.click(scanBtn);

      await waitFor(() => {
        expect(screen.getByText(/Hoàn tất quét 9 \/ 9 link phim/i)).toBeInTheDocument();
      });

      const brokenFilterBtn = screen.getByRole("button", { name: /Chỉ hiện Link Lỗi \(3\)/i });
      fireEvent.click(brokenFilterBtn);

      expect(screen.getAllByText(/HTTP 404/i).length).toBeGreaterThanOrEqual(3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
