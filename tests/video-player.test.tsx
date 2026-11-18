// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VideoPlayer } from "@/components/player/video-player";
import type { VideoSource } from "@/lib/types";

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
