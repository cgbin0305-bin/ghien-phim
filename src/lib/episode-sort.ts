import type { Episode } from "@/lib/types";

export interface SortableEpisode {
  title?: string | null;
  slug?: string | null;
  episodeNumber?: number | null;
}

/**
 * Chuẩn hóa chuỗi tên tập để trích xuất dãy số tự nhiên (Mùa / Tập / Phần).
 * Hỗ trợ cả các từ chỉ thứ tự cổ trang như Thượng (1), Trung (2), Hạ (3).
 */
function normalizeForNumberExtraction(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bthượng\b/g, " 1 ")
    .replace(/\btrung\b/g, " 2 ")
    .replace(/\bhạ\b/g, " 3 ");
}

/**
 * Trích xuất mảng các số nguyên xuất hiện trong tên tập (hoặc slug).
 * Ví dụ:
 * - "Tập 23" -> [23]
 * - "Tập 1" -> [1]
 * - "Mùa 4 - Phần 2" -> [4, 2]
 * - "Mùa 5 - Tập 12 - Phần Thượng" -> [5, 12, 1]
 */
export function extractEpisodeNumbers(ep: SortableEpisode): number[] {
  const title = (ep.title ?? "").trim();
  if (title) {
    const normalized = normalizeForNumberExtraction(title);
    const matches = normalized.match(/\d+/g);
    if (matches && matches.length > 0) {
      return matches.map((n) => Number(n)).filter((n) => Number.isFinite(n));
    }
  }

  const slug = (ep.slug ?? "").trim();
  if (slug) {
    const normalizedSlug = slug
      .toLowerCase()
      .replace(/\bthuong\b/g, " 1 ")
      .replace(/\btrung\b/g, " 2 ")
      .replace(/\bha\b/g, " 3 ");
    const matches = normalizedSlug.match(/\d+/g);
    if (matches && matches.length > 0) {
      return matches.map((n) => Number(n)).filter((n) => Number.isFinite(n));
    }
  }

  if (typeof ep.episodeNumber === "number" && Number.isFinite(ep.episodeNumber)) {
    return [ep.episodeNumber];
  }

  return [];
}

/**
 * So sánh 2 tập phim theo thứ tự số học tự nhiên (1 -> 2 -> ... -> 22 -> 23).
 *
 * Giải quyết triệt để trường hợp Admin thêm "Tập 23" trước (STT = 1) rồi mới thêm
 * "Tập 1 -> 22" sau (STT = 2..23): hệ thống luôn sắp xếp theo số tập thực tế
 * từ 1 đến 23 thay vì bị kẹt ở 23 -> 1 -> 2.
 */
export function compareEpisodes(a: SortableEpisode, b: SortableEpisode): number {
  const numsA = extractEpisodeNumbers(a);
  const numsB = extractEpisodeNumbers(b);

  const minLen = Math.min(numsA.length, numsB.length);
  for (let i = 0; i < minLen; i += 1) {
    const diff = numsA[i]! - numsB[i]!;
    if (diff !== 0) return diff;
  }

  if (numsA.length !== numsB.length) {
    return numsA.length - numsB.length;
  }

  const epNumA = typeof a.episodeNumber === "number" ? a.episodeNumber : 0;
  const epNumB = typeof b.episodeNumber === "number" ? b.episodeNumber : 0;
  if (epNumA !== epNumB) {
    return epNumA - epNumB;
  }

  return (a.title ?? "").localeCompare(b.title ?? "", "vi", { numeric: true });
}

/**
 * Trả về mảng tập phim mới đã được sắp xếp tăng dần tự nhiên (1 -> 2 -> ... -> N).
 */
export function sortEpisodes<T extends SortableEpisode>(episodes: readonly T[]): T[] {
  return [...episodes].sort(compareEpisodes);
}

/**
 * Lấy số hiển thị trên huy hiệu (badge) cạnh tên tập:
 * Ưu tiên số tập/mùa thực tế trong tiêu đề (ví dụ "Tập 23" -> 23, "Tập 1" -> 1),
 * nếu không có số trong tiêu đề mới dùng thứ tự hiển thị (index + 1).
 */
export function getEpisodeBadgeNumber(
  ep: Pick<Episode, "title" | "slug" | "episodeNumber">,
  fallbackIndex?: number,
): number {
  const nums = extractEpisodeNumbers(ep);
  if (nums.length > 0 && nums[0]! > 0) {
    return nums[0]!;
  }
  if (typeof fallbackIndex === "number") {
    return fallbackIndex + 1;
  }
  return ep.episodeNumber;
}
