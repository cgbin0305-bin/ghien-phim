import { buildEmbedUrl } from "@/lib/video/provider";
import type { VideoSource } from "@/lib/types";

export interface EpisodePartEntry {
  /** Thứ tự 0-based khớp với danh sách server/phần trong VideoPlayer. */
  index: number;
  /** Nhãn hiển thị ngắn gọn (VD: "Phần 1", "Phần 2", "Server 1"). */
  label: string;
  provider: "youtube" | "facebook";
}

/**
 * Trích xuất danh sách các phần / nguồn phát hợp lệ của một tập phim.
 * Dùng chung cho Danh sách tập (trang chi tiết phim), EpisodeSidebar (trang xem)
 * và VideoPlayer để số thứ tự phần luôn khớp 100%.
 */
export function getEpisodeParts(sources: VideoSource[]): EpisodePartEntry[] {
  const parts: EpisodePartEntry[] = [];

  for (const source of sources) {
    const splitUrls = source.sourceUrl
      .split(/[\r\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    for (let i = 0; i < splitUrls.length; i += 1) {
      const embed = buildEmbedUrl(splitUrls[i]!);
      if (!embed) continue;

      const rawLabel = source.label?.trim() || "";
      let label: string;
      if (splitUrls.length > 1) {
        label = rawLabel ? `${rawLabel} #${i + 1}` : `Phần ${parts.length + 1}`;
      } else if (rawLabel) {
        label = rawLabel;
      } else {
        label = `Phần ${parts.length + 1}`;
      }

      parts.push({
        index: parts.length,
        label,
        provider: embed.provider,
      });
    }
  }

  return parts;
}
