import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Thiết lập dùng chung cho toàn bộ test.
 *
 * - `matchMedia` và `ResizeObserver` không có trong jsdom nhưng Radix UI cần chúng.
 * - `localStorage` được reset giữa các test để các tính năng lịch sử xem
 *   không rò rỉ dữ liệu từ test này sang test khác.
 */

if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }

  if (!("ResizeObserver" in window)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  }

  if (!window.scrollTo) {
    Object.defineProperty(window, "scrollTo", { writable: true, value: () => {} });
  }
}

afterEach(() => {
  // Dọn DOM giữa các test để `screen` không tìm thấy phần tử của test trước.
  cleanup();

  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
  vi.restoreAllMocks();
});
