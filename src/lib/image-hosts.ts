/**
 * Danh sách host được phép tối ưu ảnh qua `next/image`.
 *
 * Nguồn sự thật duy nhất: file này được dùng bởi CẢ `next.config.ts`
 * (`images.remotePatterns`) VÀ `<SafeImage>` (kiểm tra runtime). Nếu tách ra
 * hai nơi, rất dễ xảy ra tình huống config cho phép nhưng component từ chối
 * (hoặc ngược lại) và trang crash với lỗi "hostname is not configured".
 */

/** Mẫu remote pattern tương thích với `next.config.ts`. */
export const IMAGE_REMOTE_PATTERNS = [
  { protocol: "https" as const, hostname: "**.supabase.co" },
  { protocol: "https" as const, hostname: "**.supabase.in" },
  { protocol: "https" as const, hostname: "images.unsplash.com" },
];

/**
 * Host được phép tối ưu ảnh.
 *
 * `next/image` **ném exception** (không phải render lỗi) khi `src` trỏ tới
 * host không nằm trong `remotePatterns`. Vì URL ảnh do quản trị viên nhập
 * tay nên có thể là bất kỳ host nào, ta kiểm tra trước khi render:
 *  - host được phép  -> dùng `next/image` (tối ưu AVIF/WebP, resize).
 *  - host lạ         -> dùng thẻ `<img>` thuần, không crash.
 */
const ALLOWED_HOST_PATTERNS: RegExp[] = [
  // *.supabase.co / *.supabase.in (bucket storage công khai)
  /^(?:[a-z0-9-]+\.)*supabase\.co$/i,
  /^(?:[a-z0-9-]+\.)*supabase\.in$/i,
  // nguồn ảnh minh hoạ tĩnh
  /^images\.unsplash\.com$/i,
];

/** Kiểm tra một hostname có được phép tối ưu ảnh hay không. */
export function isAllowedImageHost(hostname: string): boolean {
  return ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

/**
 * Host của **trang quản trị** Supabase (không phải host phục vụ file).
 *
 * Đây là cái bẫy phổ biến nhất khi nhập ảnh: quản trị viên mở Supabase
 * Dashboard, bấm vào file trong Storage rồi copy URL trên thanh địa chỉ. URL
 * đó trông rất giống link ảnh nhưng thực chất là một trang HTML:
 *
 *   https://supabase.com/dashboard/project/<ref>/storage/files/buckets/media?preview=poster.png
 *
 * Nếu đem URL này cho `next/image`, Next ném
 * `Invalid src prop ... hostname "supabase.com" is not configured` và làm sập
 * cả trang. Thậm chí nếu thêm host vào `remotePatterns` thì ảnh vẫn không hiện,
 * vì đó là HTML chứ không phải ảnh.
 *
 * `normalizeImageUrl` chuyển URL dạng này về đúng URL file công khai:
 *
 *   https://<ref>.supabase.co/storage/v1/object/public/media/poster.png
 */
const SUPABASE_DASHBOARD_HOST = /^(?:app\.)?supabase\.com$/i;

/** `/dashboard/project/<ref>/storage/files/buckets/<bucket>` (+ `/folders/<...>`). */
const SUPABASE_DASHBOARD_PATH =
  /\/dashboard\/project\/([a-z0-9]+)\/storage\/(?:files\/)?buckets\/([^/?#]+)(?:\/folders?\/([^?#]*))?/i;

/**
 * Chuyển URL trang quản trị Supabase thành URL file công khai.
 *
 * Trả về nguyên chuỗi ban đầu khi không nhận dạng được (ví dụ link không có
 * tham số `preview`), để phần kiểm tra phía sau tự quyết định.
 */
export function normalizeSupabaseDashboardUrl(src: string): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  if (!SUPABASE_DASHBOARD_HOST.test(url.hostname)) return src;

  const match = SUPABASE_DASHBOARD_PATH.exec(url.pathname);
  if (!match) return src;

  const [, projectRef, bucket] = match;
  if (!projectRef || !bucket) return src;

  // Tên file nằm trong query: `?preview=<tên file>`. Với thư mục con,
  // `?folder=<thư mục>` xuất hiện cùng `preview`.
  const fileName = url.searchParams.get("preview") ?? url.searchParams.get("name");
  if (!fileName) return src;

  const folder = url.searchParams.get("folder") ?? match[3] ?? "";
  const segments = [...folder.split("/"), ...fileName.split("/")].filter(Boolean);
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");

  return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Chuẩn hoá URL ảnh trước khi dùng.
 *
 * Hiện chỉ xử lý link trang quản trị Supabase — nguồn lỗi hay gặp nhất — và
 * trả nguyên các URL khác.
 */
export function normalizeImageUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return "";
  return normalizeSupabaseDashboardUrl(trimmed);
}

/**
 * Phân loại nguồn ảnh.
 *
 * - `"local"`: đường dẫn nội bộ (`/api/poster/…`) -> `next/image` với
 *   `images.localPatterns`.
 * - `"remote"`: URL tuyệt đối có host được phép -> `next/image`.
 * - `"external"`: URL tuyệt đối có host lạ -> thẻ `<img>` thuần.
 */
export type ImageSourceKind = "local" | "remote" | "external";

export function classifyImageSource(src: string): ImageSourceKind {
  const normalized = normalizeImageUrl(src);
  if (!normalized) return "local";
  if (normalized.startsWith("/")) return "local";

  if (!/^https?:\/\//i.test(normalized)) {
    // `data:` và `blob:` được `next/image` tự xử lý.
    return "remote";
  }

  try {
    const { hostname } = new URL(normalized);
    return isAllowedImageHost(hostname) ? "remote" : "external";
  } catch {
    return "external";
  }
}
