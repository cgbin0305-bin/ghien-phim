// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VideoPlayer } from "@/components/player/video-player";
import { EpisodeListGrid } from "@/components/movie/episode-part-list";
import { EpisodeSidebar } from "@/components/player/episode-sidebar";
import type { Episode, VideoSource } from "@/lib/types";

/**
 * Hồi quy cho hai nút trên trình phát.
 *
 * Lỗi được báo:
 *   - "Mở rộng" không hoạt động.
 *   - Bấm "Tắt đèn" lại chạy chức năng mở rộng.
 *
 * Nguyên nhân gốc: state `expanded` được bật/tắt nhưng **không được gắn vào
 * class hay API nào**, nên nút mở rộng không có tác dụng; trong khi đó
 * `lightsOff` lại gắn `fixed inset-0` lên cả khối, khiến "Tắt đèn" trông y như
 * một lần mở rộng toàn màn hình. Hai nút vì thế bị hoán đổi cảm giác.
 */

const sources: VideoSource[] = [
  {
    id: "s-1",
    episodeId: "e-1",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    label: "Vietsub",
    priority: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

function renderPlayer() {
  return render(<VideoPlayer sources={sources} title="Vấn Kiếm Lâm Ngô Tập 1" />);
}

describe("VideoPlayer — nút Mở rộng", () => {
  beforeEach(() => {
    // jsdom không có Fullscreen API; cung cấp bản giả để kiểm tra lời gọi.
    const frame = document.createElement("div");
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      writable: true,
      value: function requestFullscreen(this: HTMLElement) {
        Object.defineProperty(document, "fullscreenElement", {
          configurable: true,
          get: () => this,
        });
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
    });
    void frame;
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      writable: true,
      value: () => {
        Object.defineProperty(document, "fullscreenElement", {
          configurable: true,
          get: () => null,
        });
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });
    Object.defineProperty(document, "webkitFullscreenElement", {
      configurable: true,
      get: () => undefined,
    });
  });

  it("gọi Fullscreen API trên khung phát khi bấm Mở rộng", async () => {
    const user = userEvent.setup();
    renderPlayer();

    const frame = document.querySelector("iframe")?.parentElement;
    expect(frame).not.toBeNull();
    const spy = vi.spyOn(frame as HTMLElement, "requestFullscreen");

    await user.click(screen.getByRole("button", { name: "Mở rộng" }));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("đổi nhãn thành Thu nhỏ sau khi vào fullscreen", async () => {
    const user = userEvent.setup();
    renderPlayer();

    await user.click(screen.getByRole("button", { name: "Mở rộng" }));

    expect(screen.getByRole("button", { name: "Thu nhỏ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thoát toàn màn hình" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thu nhỏ" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("thoát fullscreen khi bấm Thu nhỏ", async () => {
    const user = userEvent.setup();
    renderPlayer();

    await user.click(screen.getByRole("button", { name: "Mở rộng" }));
    const exitSpy = vi.spyOn(document, "exitFullscreen");
    await user.click(screen.getByRole("button", { name: "Thu nhỏ" }));

    expect(exitSpy).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Mở rộng" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  /**
   * Hồi quy lỗi lệch trạng thái: trước đây state `expanded` được set thủ công
   * khi bấm nút, nên khi người dùng bấm ESC để thoát fullscreen, nút vẫn hiện
   * "Thu nhỏ" dù thực tế đã thoát. Nay state phải luôn bám theo trình duyệt.
   */
  it("đồng bộ nút khi người dùng bấm ESC để thoát fullscreen", async () => {
    const user = userEvent.setup();
    renderPlayer();

    await user.click(screen.getByRole("button", { name: "Mở rộng" }));
    expect(screen.getByRole("button", { name: "Thu nhỏ" })).toBeInTheDocument();

    // ESC do trình duyệt xử lý: nó thoát fullscreen (phần tử fullscreen trở
    // thành null) rồi bắn `fullscreenchange`.
    void document.exitFullscreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mở rộng" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
    expect(screen.queryByRole("button", { name: "Thu nhỏ" })).not.toBeInTheDocument();
  });

  it("nghe cả biến thể sự kiện của Safari (webkitfullscreenchange)", async () => {
    renderPlayer();

    // Mô phỏng Safari: chỉ có `webkitFullscreenElement`, không có bản chuẩn.
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => undefined,
    });
    Object.defineProperty(document, "webkitFullscreenElement", {
      configurable: true,
      get: () => document.body,
    });

    document.dispatchEvent(new Event("webkitfullscreenchange"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Thu nhỏ" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });

  it("tự động bật fallback toàn màn hình CSS trên điện thoại (iOS / không hỗ trợ requestFullscreen)", async () => {
    const user = userEvent.setup();
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    renderPlayer();

    await user.click(screen.getByRole("button", { name: "Mở rộng" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Thoát toàn màn hình" })).toBeInTheDocument();
    });

    const frame = document.querySelector("iframe")?.parentElement;
    expect(frame?.className).toContain("fixed");
    expect(frame?.className).toContain("inset-0");

    await user.click(screen.getByRole("button", { name: "Thoát toàn màn hình" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Thoát toàn màn hình" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Mở rộng" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("VideoPlayer — nút Tắt đèn", () => {
  it("bật lớp phủ tối mà không vào fullscreen", async () => {
    const user = userEvent.setup();
    renderPlayer();

    const frame = document.querySelector("iframe")?.parentElement as HTMLElement;
    const fullscreenSpy = vi.spyOn(frame, "requestFullscreen");

    await user.click(screen.getByRole("button", { name: "Tắt đèn" }));

    // Đây là điểm mấu chốt: tắt đèn KHÔNG được kích hoạt mở rộng.
    expect(fullscreenSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Bật đèn" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("hiện lớp phủ tối và tắt lại được", async () => {
    const user = userEvent.setup();
    const { container } = renderPlayer();

    await user.click(screen.getByRole("button", { name: "Tắt đèn" }));
    expect(container.querySelector(".fixed.inset-0")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Bật đèn" }));
    expect(container.querySelector(".fixed.inset-0")).toBeNull();
  });

  it("thoát bằng phím Escape", async () => {
    const user = userEvent.setup();
    const { container } = renderPlayer();

    await user.click(screen.getByRole("button", { name: "Tắt đèn" }));
    expect(container.querySelector(".fixed.inset-0")).not.toBeNull();

    await user.keyboard("{Escape}");

    expect(container.querySelector(".fixed.inset-0")).toBeNull();
    expect(screen.getByRole("button", { name: "Tắt đèn" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("Dropdown chọn phần cho tập có nhiều phần", () => {
  const multiPartEpisodes: Episode[] = [
    {
      id: "ep-1",
      movieId: "m-1",
      episodeNumber: 1,
      title: "Tập 1",
      slug: "tap-1",
      releaseDate: null,
      status: "published",
      description: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sources: [
        {
          id: "s-1",
          episodeId: "ep-1",
          provider: "youtube",
          sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          label: "Phần 1",
          priority: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "s-2",
          episodeId: "ep-1",
          provider: "youtube",
          sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
          label: "Phần 2",
          priority: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
    {
      id: "ep-2",
      movieId: "m-1",
      episodeNumber: 2,
      title: "Tập 2",
      slug: "tap-2",
      releaseDate: null,
      status: "published",
      description: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sources: [
        {
          id: "s-3",
          episodeId: "ep-2",
          provider: "youtube",
          sourceUrl: "https://www.youtube.com/watch?v=YE7VzlLtp-4",
          label: "Vietsub",
          priority: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
  ];

  it("EpisodeListGrid hiển thị nút dropdown cho tập có nhiều phần và mở danh sách phần", async () => {
    const user = userEvent.setup();
    render(
      <EpisodeListGrid
        movieSlug="van-kiem"
        movieTitle="Vấn Kiếm"
        episodes={multiPartEpisodes}
      />,
    );

    const dropdownBtn = screen.getByRole("button", { name: "Chọn phần cho Tập 1" });
    expect(dropdownBtn).toHaveTextContent("2 phần");
    expect(screen.queryByRole("button", { name: "Chọn phần cho Tập 2" })).not.toBeInTheDocument();

    await user.click(dropdownBtn);
    expect(screen.getByRole("link", { name: /Phần 1/i })).toHaveAttribute(
      "href",
      "/xem/van-kiem/tap-1?phan=1",
    );
    expect(screen.getByRole("link", { name: /Phần 2/i })).toHaveAttribute(
      "href",
      "/xem/van-kiem/tap-1?phan=2",
    );
  });

  it("EpisodeSidebar hiển thị dropdown phần cạnh tập phim và tự mở cho tập đang phát", () => {
    render(
      <EpisodeSidebar
        movieSlug="van-kiem"
        movieTitle="Vấn Kiếm"
        episodes={multiPartEpisodes}
        currentEpisodeId="ep-1"
        currentPartIndex={1}
      />,
    );

    const sidebarDropdown = screen.getByRole("button", { name: "Xem các phần của Tập 1" });
    expect(sidebarDropdown).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /Phần 2/i })).toHaveAttribute(
      "href",
      "/xem/van-kiem/tap-1?phan=2",
    );
  });

  it("hiển thị nút mở trực tiếp video trên YouTube/Facebook nếu xem trên web bất tiện", () => {
    renderPlayer();
    const extLink = screen.getByRole("link", { name: "Mở trên YouTube" });
    expect(extLink).toHaveAttribute("href", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(extLink).toHaveAttribute("target", "_blank");
  });
});
