// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/movie/pagination";
import { ScheduleStrip } from "@/components/movie/schedule-strip";
import {
  ContinueWatching,
  recordWatchEntry,
  clearWatchHistory,
} from "@/components/movie/continue-watching";
import { Button } from "@/components/ui/button";
import type { ScheduleEvent } from "@/lib/types";

/**
 * Test cho các component hiển thị thuần (không cần Server Action).
 *
 * Mục tiêu: bảo đảm class Tailwind quan trọng (nền, viền, z-index) không bị
 * mất. Nếu `@config` trong `globals.css` biến mất, các class như `bg-ink-850`
 * sẽ không còn trong CSS và giao diện sẽ chỉ còn text thuần — đó là lỗi đã
 * gặp. Test dưới đây chốt lại những class đó.
 */

describe("Badge", () => {
  it("render nội dung và variant mặc định", () => {
    render(<Badge>Đang chiếu</Badge>);
    const badge = screen.getByText("Đang chiếu");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("border-ink-600");
    expect(badge.className).toContain("bg-ink-800");
  });

  it("dùng class vàng cho variant gold", () => {
    render(<Badge variant="gold">Phim nổi bật</Badge>);
    const badge = screen.getByText("Phim nổi bật");
    expect(badge.className).toContain("text-gold-200");
  });

  it("dùng class jade cho variant jade", () => {
    render(<Badge variant="jade">Vietsub</Badge>);
    expect(screen.getByText("Vietsub").className).toContain("text-jade-100");
  });

  it("dùng class rouge cho variant rouge", () => {
    render(<Badge variant="rouge">Hoãn</Badge>);
    expect(screen.getByText("Hoãn").className).toContain("text-rouge-300");
  });
});

describe("Button", () => {
  it("render nội dung và không bị disabled mặc định", () => {
    render(<Button>Lưu</Button>);
    const button = screen.getByRole("button", { name: "Lưu" });
    expect(button).toBeEnabled();
  });

  it("bị disabled khi truyền disabled", () => {
    render(<Button disabled>Đang lưu…</Button>);
    expect(screen.getByRole("button", { name: "Đang lưu…" })).toBeDisabled();
  });
});

describe("Pagination", () => {
  it("không render khi chỉ có một trang", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} searchParams={{}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("đánh dấu trang hiện tại bằng aria-current", () => {
    render(<Pagination page={2} totalPages={5} searchParams={{}} />);
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("aria-current", "page");
  });

  it("giữ các bộ lọc khác khi chuyển trang", () => {
    render(<Pagination page={2} totalPages={5} searchParams={{ genre: "co-trang" }} />);
    const link = screen.getByRole("link", { name: "3" });
    expect(link.getAttribute("href")).toBe("/phim?genre=co-trang&page=3");
  });

  it("bỏ tham số page ở trang đầu tiên", () => {
    render(<Pagination page={1} totalPages={3} searchParams={{ genre: "co-trang" }} />);
    const link = screen.getByRole("link", { name: "1" });
    expect(link.getAttribute("href")).toBe("/phim?genre=co-trang");
  });

  it("không có liên kết Trang trước ở trang 1", () => {
    render(<Pagination page={1} totalPages={3} searchParams={{}} />);
    expect(screen.queryByRole("link", { name: "Trang trước" })).not.toBeInTheDocument();
    // Nút bị vô hiệu vẫn được render để giữ bố cục, nhưng không phải liên kết.
    expect(screen.getByText("Trang trước")).toBeInTheDocument();
  });

  it("không có liên kết Trang sau ở trang cuối", () => {
    render(<Pagination page={3} totalPages={3} searchParams={{}} />);
    expect(screen.queryByRole("link", { name: "Trang sau" })).not.toBeInTheDocument();
  });

  it("hiện nút Trang sau khi không phải trang cuối", () => {
    render(<Pagination page={1} totalPages={3} searchParams={{}} />);
    expect(screen.getByText("Trang sau")).toBeInTheDocument();
  });
});

describe("ScheduleStrip", () => {
  const baseEvent: ScheduleEvent = {
    id: "s-1",
    movieId: "m-1",
    episodeId: "e-1",
    episodeNumber: 12,
    scheduledAt: new Date().toISOString(),
    status: "scheduled",
    note: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    movie: { id: "m-1", slug: "van-kiem-lam-ngo", title: "Vấn Kiếm Lâm Ngô", posterUrl: null },
    episode: {
      id: "e-1",
      slug: "tap-12",
      title: "Tập 12",
      episodeNumber: 12,
      status: "published",
    },
  };

  it("hiện thông báo khi không có lịch", () => {
    render(<ScheduleStrip events={[]} />);
    expect(screen.getByText("Chưa có lịch chiếu cho tuần này.")).toBeInTheDocument();
  });

  it("render tên phim và số tập", () => {
    render(<ScheduleStrip events={[baseEvent]} />);
    expect(screen.getByText("Vấn Kiếm Lâm Ngô")).toBeInTheDocument();
    expect(screen.getByText(/Tập 12/)).toBeInTheDocument();
  });

  it("đổi nhãn trạng thái theo từng loại", () => {
    const { rerender } = render(<ScheduleStrip events={[baseEvent]} />);
    expect(screen.getByText("Dự kiến")).toBeInTheDocument();

    rerender(<ScheduleStrip events={[{ ...baseEvent, status: "aired" }]} />);
    expect(screen.getByText("Đã lên sóng")).toBeInTheDocument();

    rerender(<ScheduleStrip events={[{ ...baseEvent, status: "postponed" }]} />);
    expect(screen.getByText("Hoãn")).toBeInTheDocument();
  });

  it("giới hạn tối đa 6 sự kiện", () => {
    const events = Array.from({ length: 10 }, (_, i) => ({
      ...baseEvent,
      id: `s-${i}`,
    }));
    render(<ScheduleStrip events={events} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });
});

describe("ContinueWatching", () => {
  beforeEach(() => {
    clearWatchHistory();
  });

  it("xóa từng tập hoặc xóa toàn bộ lịch sử xem", () => {
    recordWatchEntry({
      movieSlug: "thien-dao-du-do",
      episodeSlug: "tap-1",
      movieTitle: "Thiên Đạo Dư Đồ",
      episodeTitle: "Tập 1",
    });
    recordWatchEntry({
      movieSlug: "tu-tien-voi-ngu-linh-can",
      episodeSlug: "mua-2-phan-1",
      movieTitle: "Tu Tiên Với Ngũ Linh Căn",
      episodeTitle: "Mùa 2 - Phần 1",
    });

    render(<ContinueWatching movies={[]} />);

    expect(screen.getByText("Thiên Đạo Dư Đồ")).toBeInTheDocument();
    expect(screen.getByText("Tu Tiên Với Ngũ Linh Căn")).toBeInTheDocument();

    // Xóa 1 mục khỏi lịch sử xem
    const removeBtn = screen.getByRole("button", {
      name: /Xóa Thiên Đạo Dư Đồ - Tập 1 khỏi lịch sử xem/i,
    });
    fireEvent.click(removeBtn);

    expect(screen.queryByText("Thiên Đạo Dư Đồ")).not.toBeInTheDocument();
    expect(screen.getByText("Tu Tiên Với Ngũ Linh Căn")).toBeInTheDocument();

    // Xóa tất cả lịch sử xem
    const clearAllBtn = screen.getByRole("button", {
      name: /Xóa tất cả lịch sử/i,
    });
    fireEvent.click(clearAllBtn);

    expect(screen.queryByText("Tu Tiên Với Ngũ Linh Căn")).not.toBeInTheDocument();
    expect(screen.queryByText("Tiếp tục xem")).not.toBeInTheDocument();
  });
});
