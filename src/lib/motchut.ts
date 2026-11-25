/**
 * Tích hợp API Cộng Tác Viên — Một Chút (`motchutphim.com`).
 *
 * Chứa các kiểu dữ liệu, hàm chuẩn hoá/khớp phim tự động và hàm kiểm tra hợp lệ
 * phía server/client theo đúng đặc tả trong `HUONG-DAN-API-DANG-PHIM-CTV.md`.
 */

export const MOTCHUT_API_BASE = "https://motchutphim.com/api/contribute";

export const MOTCHUT_CODE_REGEX = /^[A-Za-z0-9_-]{32}$/;
export const MOTCHUT_UPDATE_FOR_REGEX =
  /^contrib-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MotChutFormat = "Phim 3D" | "Phim 2D" | "Phim AI";
export type MotChutAudio = "" | "Thuyết Minh";
export type MotChutUpdateMode = "append" | "replace";

export interface MotChutPart {
  name: string;
  fbUrl?: string;
  ytUrl?: string;
}

export interface MotChutSubmitInput {
  title?: string;
  originalTitle?: string;
  format?: MotChutFormat;
  audio?: MotChutAudio;
  thumbnail?: string;
  description?: string;
  tags?: string[];
  completed?: boolean;
  parts: MotChutPart[];
  updateFor?: string;
  updateMode?: MotChutUpdateMode;
}

export interface MotChutMinePart {
  id?: string;
  name: string;
  fbUrl?: string;
  ytUrl?: string;
  vipUrl?: string;
}

export interface MotChutMineMovie {
  id: string;
  title: string;
  originalTitle?: string;
  format?: string;
  audio?: string;
  tags?: string[];
  parts: MotChutMinePart[];
  completed?: boolean;
  updatedAt?: string;
}

export interface MotChutMinePending {
  id: string;
  title: string;
  updateFor?: string;
  updateMode?: string;
  submittedAt?: string;
  parts: Array<{ name: string }>;
}

export interface MotChutMineResponse {
  contributor: string;
  movies: MotChutMineMovie[];
  pending: MotChutMinePending[];
}

export interface MotChutSubmitResponse {
  id: string;
  status: string;
  message: string;
}

export function isValidMotChutCode(code: string): boolean {
  return MOTCHUT_CODE_REGEX.test(code.trim());
}

export function isValidMotChutThumbnail(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true; // không bắt buộc
  if (trimmed.length > 1200) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    return /\.(jpe?g|png|webp)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function isValidMotChutFbUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fb.watch" ||
      host.endsWith(".fb.watch")
    );
  } catch {
    return false;
  }
}

export function isValidMotChutYtUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be"
    );
  } catch {
    return false;
  }
}

/**
 * Chuẩn hoá tiêu đề (bỏ dấu tiếng Việt, thường hoá, gọn khoảng trắng) để đối chiếu phim.
 */
export function normalizeTitleForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const MOTCHUT_ALLOWED_TAGS = [
  "Tu Tiên",
  "Xuyên Không",
  "Huyền Huyễn",
  "Trọng Sinh",
  "Đô Thị",
  "Ngôn Tình",
  "Hệ Thống",
  "Nữ Chính",
  "Nam Chính",
] as const;

export type MotChutTag = (typeof MOTCHUT_ALLOWED_TAGS)[number];

const MOTCHUT_TAG_MAP: Record<string, MotChutTag> = {
  "tu tien": "Tu Tiên",
  "tien hiem": "Tu Tiên",
  "tien hiep": "Tu Tiên",
  "xuyen khong": "Xuyên Không",
  "huyen huyen": "Huyền Huyễn",
  "trong sinh": "Trọng Sinh",
  "do thi": "Đô Thị",
  "ngon tinh": "Ngôn Tình",
  "tinh hoan": "Ngôn Tình",
  "tinh cam": "Ngôn Tình",
  "he thong": "Hệ Thống",
  "nu chinh": "Nữ Chính",
  "nam chinh": "Nam Chính",
};

/**
 * Chuyển đổi danh sách tên thể loại của Ghiền Phim sang đúng bộ 9 thẻ của Một Chút.
 * Thể loại nào không có bên Một Chút sẽ được bỏ ra.
 */
export function mapGenresToMotChutTags(genreNames: string[]): MotChutTag[] {
  const result: MotChutTag[] = [];
  const seen = new Set<MotChutTag>();

  for (const raw of genreNames) {
    const key = normalizeTitleForMatch(raw);
    const mapped = MOTCHUT_TAG_MAP[key];
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      result.push(mapped);
    }
    if (result.length >= 8) break;
  }

  return result;
}

/**
 * Tìm phim đã duyệt trên Một Chút khớp với `title` hoặc `originalTitle` hiện tại.
 */
export function findMatchingMotChutMovie(
  movies: MotChutMineMovie[],
  title: string,
  originalTitle?: string | null,
): MotChutMineMovie | null {
  const targetTitle = normalizeTitleForMatch(title);
  const targetOriginal = originalTitle ? normalizeTitleForMatch(originalTitle) : "";

  if (!targetTitle && !targetOriginal) return null;

  for (const movie of movies) {
    const mTitle = normalizeTitleForMatch(movie.title);
    const mOrig = movie.originalTitle ? normalizeTitleForMatch(movie.originalTitle) : "";
    if (targetTitle && mTitle === targetTitle) return movie;
    if (targetOriginal && (mOrig === targetOriginal || mTitle === targetOriginal)) return movie;
  }

  return null;
}

/**
 * Chuyển đổi danh sách nguồn phát của 1 tập trong admin thành mảng `parts` của Một Chút.
 * - Nếu chỉ có tối đa 1 link Facebook và 1 link YouTube (không tách phần riêng): gộp thành 1 phần chung.
 * - Nếu có nhiều link cùng nền tảng hoặc nhãn có chữ "Phần": tách thành nhiều phần tương ứng.
 */
export function sourcesToMotChutParts(
  episodeTitle: string,
  episodeNumber: number | string,
  sources: Array<{ provider: "youtube" | "facebook"; sourceUrl: string; label?: string }>,
): MotChutPart[] {
  const baseName = (episodeTitle.trim() || `Tập ${episodeNumber || 1}`).slice(0, 80);
  const validSources = sources
    .map((s) => ({
      provider: s.provider,
      sourceUrl: s.sourceUrl.trim(),
      label: s.label?.trim() ?? "",
    }))
    .filter((s) => s.sourceUrl.length > 0);

  if (validSources.length === 0) {
    return [{ name: baseName, fbUrl: "", ytUrl: "" }];
  }

  const fbSources = validSources.filter((s) => s.provider === "facebook");
  const ytSources = validSources.filter((s) => s.provider === "youtube");
  const hasExplicitParts = validSources.some((s) => /^phần\s*\d+/i.test(s.label));

  if (fbSources.length <= 1 && ytSources.length <= 1 && !hasExplicitParts) {
    return [
      {
        name: baseName,
        fbUrl: fbSources[0]?.sourceUrl ?? "",
        ytUrl: ytSources[0]?.sourceUrl ?? "",
      },
    ];
  }

  return validSources.slice(0, 30).map((s, idx) => {
    const partLabel = s.label || `Phần ${idx + 1}`;
    const combinedName =
      validSources.length === 1 ? baseName : `${baseName} - ${partLabel}`.slice(0, 80);
    return {
      name: combinedName,
      fbUrl: s.provider === "facebook" ? s.sourceUrl : "",
      ytUrl: s.provider === "youtube" ? s.sourceUrl : "",
    };
  });
}

/**
 * Kiểm tra và dựng JSON payload chuẩn theo bảng quy tắc Một Chút.
 */
export function validateAndBuildMotChutPayload(
  input: MotChutSubmitInput,
  ctvCode: string,
): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const code = ctvCode.trim();
  if (!isValidMotChutCode(code)) {
    return {
      ok: false,
      error: "Mã CTV Một Chút phải gồm đúng 32 ký tự chữ, số, `_` hoặc `-`.",
    };
  }

  const updateFor = input.updateFor?.trim() ?? "";
  const isUpdating = updateFor.length > 0;
  const updateMode: MotChutUpdateMode | undefined = isUpdating
    ? input.updateMode === "replace"
      ? "replace"
      : "append"
    : undefined;

  if (isUpdating && !MOTCHUT_UPDATE_FOR_REGEX.test(updateFor)) {
    return {
      ok: false,
      error: "ID phim Một Chút (updateFor) không đúng định dạng `contrib-...`.",
    };
  }

  const title = (input.title ?? "").trim();
  if ((!isUpdating || updateMode === "replace") && (title.length < 2 || title.length > 160)) {
    return {
      ok: false,
      error: "Tên phim tiếng Việt (title) phải từ 2 đến 160 ký tự.",
    };
  }

  const thumbnail = (input.thumbnail ?? "").trim();
  if (thumbnail && !isValidMotChutThumbnail(thumbnail)) {
    return {
      ok: false,
      error:
        "Ảnh bìa (thumbnail) phải là link HTTPS trực tiếp kết thúc bằng .jpg, .jpeg, .png hoặc .webp (≤ 1.200 ký tự).",
    };
  }

  if (!Array.isArray(input.parts) || input.parts.length === 0 || input.parts.length > 30) {
    return {
      ok: false,
      error: "Cần từ 1 đến 30 phần (parts) có link Facebook hoặc YouTube hợp lệ.",
    };
  }

  const seenNames = new Set<string>();
  const seenUrls = new Set<string>();
  const cleanParts: Array<{ name: string; fbUrl: string; ytUrl: string }> = [];

  for (let i = 0; i < input.parts.length; i += 1) {
    const rawPart = input.parts[i]!;
    const name = (rawPart.name || `Phần ${i + 1}`).trim().slice(0, 80);
    const fbUrl = (rawPart.fbUrl ?? "").trim();
    const ytUrl = (rawPart.ytUrl ?? "").trim();

    if (!name) {
      return { ok: false, error: `Phần ${i + 1}: Tên phần không được để trống.` };
    }
    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) {
      return { ok: false, error: `Tên phần "${name}" bị trùng lặp.` };
    }
    seenNames.add(nameKey);

    if (!fbUrl && !ytUrl) {
      return {
        ok: false,
        error: `Phần "${name}": Bắt buộc có ít nhất 1 link Facebook hoặc YouTube.`,
      };
    }

    if (fbUrl) {
      if (!isValidMotChutFbUrl(fbUrl)) {
        return {
          ok: false,
          error: `Phần "${name}": Link Facebook phải là HTTPS thuộc facebook.com hoặc fb.watch.`,
        };
      }
      if (seenUrls.has(fbUrl)) {
        return { ok: false, error: `Phần "${name}": Link Facebook bị trùng với phần khác.` };
      }
      seenUrls.add(fbUrl);
    }

    if (ytUrl) {
      if (!isValidMotChutYtUrl(ytUrl)) {
        return {
          ok: false,
          error: `Phần "${name}": Link YouTube phải là HTTPS thuộc youtube.com hoặc youtu.be.`,
        };
      }
      if (seenUrls.has(ytUrl)) {
        return { ok: false, error: `Phần "${name}": Link YouTube bị trùng với phần khác.` };
      }
      seenUrls.add(ytUrl);
    }

    cleanParts.push({ name, fbUrl, ytUrl });
  }

  if (isUpdating && updateMode === "append") {
    return {
      ok: true,
      payload: {
        code,
        updateFor,
        updateMode: "append",
        parts: cleanParts,
      },
    };
  }

  const tags = mapGenresToMotChutTags(input.tags ?? []);

  const payload: Record<string, unknown> = {
    code,
    updateFor: isUpdating ? updateFor : "",
    updateMode: isUpdating ? updateMode : "append",
    title,
    originalTitle: (input.originalTitle ?? "").trim().slice(0, 160),
    format: input.format ?? "Phim 3D",
    audio: input.audio ?? "Thuyết Minh",
    thumbnail,
    thumbnailFile: "",
    description: (input.description ?? "").trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n").slice(0, 2500),
    tags,
    ...(input.completed ? { completed: true } : {}),
    parts: cleanParts,
  };

  return { ok: true, payload };
}
