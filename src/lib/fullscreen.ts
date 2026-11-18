/**
 * Lớp bọc Fullscreen API.
 *
 * Fullscreen API có tiền tố theo trình duyệt:
 *
 *   - Chuẩn (Chrome, Edge, Firefox): `fullscreenElement`, `requestFullscreen()`,
 *     `exitFullscreen()`, sự kiện `fullscreenchange`.
 *   - Safari (WebKit): `webkitFullscreenElement`, `webkitRequestFullscreen()`,
 *     `webkitExitFullscreen()`, sự kiện `webkitfullscreenchange`.
 *   - Firefox cũ: `mozFullScreenElement`, `mozRequestFullScreen()`,
 *     `mozCancelFullScreen()`, sự kiện `mozfullscreenchange`.
 *   - IE/Edge cũ: `msFullscreenElement`, `msRequestFullscreen()`,
 *     `msExitFullscreen()`, sự kiện `MSFullscreenChange`.
 *
 * Module này gom toàn bộ phần "đoán xem trình duyệt hỗ trợ gì" vào một chỗ,
 * để component chỉ cần gọi `getFullscreenElement()` / `requestFullscreen()` /
 * `exitFullscreen()` mà không phải rà soát từng prefix.
 */

/** Các tên sự kiện báo "đã vào/ra fullscreen" của mọi trình duyệt. */
export const FULLSCREEN_CHANGE_EVENTS = [
  "fullscreenchange",
  "webkitfullscreenchange",
  "mozfullscreenchange",
  "MSFullscreenChange",
] as const;

declare global {
  interface Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
    mozCancelFullScreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
  }

  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  }
}

/**
 * Phần tử đang chiếm toàn màn hình, hoặc `null` nếu không có.
 *
 * Luôn ưu tiên thuộc tính chuẩn; chỉ fallback sang biến thể có tiền tố khi
 * thuộc tính chuẩn không tồn tại.
 */
export function getFullscreenElement(): Element | null {
  const doc = document as Document;
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

/** Đưa một phần tử vào chế độ toàn màn hình. */
export function requestFullscreen(element: HTMLElement): Promise<void> {
  const request =
    element.requestFullscreen ??
    element.webkitRequestFullscreen ??
    element.mozRequestFullScreen ??
    element.msRequestFullscreen;

  if (!request) {
    return Promise.reject(new Error("Trình duyệt không hỗ trợ toàn màn hình."));
  }

  // Safari cũ trả về `undefined` thay vì Promise -> bọc lại cho thống nhất.
  return Promise.resolve(request.call(element)).then(() => undefined);
}

/** Thoát chế độ toàn màn hình. */
export function exitFullscreen(): Promise<void> {
  const doc = document as Document;
  const exit =
    doc.exitFullscreen ??
    doc.webkitExitFullscreen ??
    doc.mozCancelFullScreen ??
    doc.msExitFullscreen;

  if (!exit) {
    return Promise.reject(new Error("Trình duyệt không hỗ trợ toàn màn hình."));
  }

  return Promise.resolve(exit.call(doc)).then(() => undefined);
}

/**
 * Gắn listener cho mọi biến thể sự kiện fullscreen.
 *
 * Trả về hàm gỡ listener (dùng trong `useEffect`).
 */
export function onFullscreenChange(listener: () => void): () => void {
  for (const eventName of FULLSCREEN_CHANGE_EVENTS) {
    document.addEventListener(eventName, listener);
  }

  return () => {
    for (const eventName of FULLSCREEN_CHANGE_EVENTS) {
      document.removeEventListener(eventName, listener);
    }
  };
}
