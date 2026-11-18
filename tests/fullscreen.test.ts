// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FULLSCREEN_CHANGE_EVENTS,
  exitFullscreen,
  getFullscreenElement,
  onFullscreenChange,
  requestFullscreen,
} from "@/lib/fullscreen";

/**
 * Lớp bọc Fullscreen API.
 *
 * Mục tiêu: component chỉ cần biết "đang fullscreen hay không" và "bật/tắt
 * nó", mà không phải rà soát từng tiền tố của từng trình duyệt.
 */

const originalFullscreenElement = Object.getOwnPropertyDescriptor(
  Document.prototype,
  "fullscreenElement",
);

function setFullscreenElement(value: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => value,
  });
}

afterEach(() => {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    writable: true,
    value: undefined,
  });
  if (originalFullscreenElement) {
    Object.defineProperty(Document.prototype, "fullscreenElement", originalFullscreenElement);
  }
  vi.restoreAllMocks();
});

describe("getFullscreenElement", () => {
  it("trả null khi không có phần tử nào fullscreen", () => {
    setFullscreenElement(null);
    expect(getFullscreenElement()).toBeNull();
  });

  it("trả phần tử đang fullscreen theo API chuẩn", () => {
    const element = document.createElement("div");
    setFullscreenElement(element);
    expect(getFullscreenElement()).toBe(element);
  });

  it("fallback sang biến thể có tiền tố khi API chuẩn không có", () => {
    const element = document.createElement("div");
    setFullscreenElement(undefined as unknown as Element | null);
    Object.defineProperty(document, "webkitFullscreenElement", {
      configurable: true,
      get: () => element,
    });

    expect(getFullscreenElement()).toBe(element);
  });
});

describe("requestFullscreen", () => {
  it("gọi requestFullscreen chuẩn khi có", async () => {
    const element = document.createElement("div");
    const spy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(element, "requestFullscreen", {
      configurable: true,
      value: spy,
    });

    await requestFullscreen(element);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("dùng biến thể có tiền tố khi không có API chuẩn", async () => {
    const element = document.createElement("div");
    const spy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(element, "webkitRequestFullscreen", {
      configurable: true,
      value: spy,
    });

    await requestFullscreen(element);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("ném lỗi khi trình duyệt không hỗ trợ toàn màn hình", async () => {
    const element = document.createElement("div");
    await expect(requestFullscreen(element)).rejects.toThrow(/không hỗ trợ/i);
  });
});

describe("exitFullscreen", () => {
  it("gọi exitFullscreen chuẩn khi có", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: spy,
    });

    await exitFullscreen();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("ném lỗi khi không có API thoát fullscreen", async () => {
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: undefined,
    });

    await expect(exitFullscreen()).rejects.toThrow(/không hỗ trợ/i);
  });
});

describe("onFullscreenChange", () => {
  it("nghe mọi biến thể sự kiện và trả về hàm gỡ listener", () => {
    const listener = vi.fn();
    const unsubscribe = onFullscreenChange(listener);

    for (const eventName of FULLSCREEN_CHANGE_EVENTS) {
      document.dispatchEvent(new Event(eventName));
    }
    expect(listener).toHaveBeenCalledTimes(FULLSCREEN_CHANGE_EVENTS.length);

    unsubscribe();
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(listener).toHaveBeenCalledTimes(FULLSCREEN_CHANGE_EVENTS.length);
  });
});
