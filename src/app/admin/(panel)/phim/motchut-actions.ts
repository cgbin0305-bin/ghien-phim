"use server";

import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import {
  MOTCHUT_API_BASE,
  isValidMotChutCode,
  sourcesToMotChutParts,
  validateAndBuildMotChutPayload,
  type MotChutMineResponse,
  type MotChutPart,
  type MotChutSubmitInput,
  type MotChutSubmitResponse,
} from "@/lib/motchut";

function resolveMotChutCode(codeOverride?: string): string {
  const envCode = process.env.MOTCHUT_CTV_CODE?.trim() ?? "";
  if (envCode) return envCode;
  return codeOverride?.trim() ?? "";
}

function formatMotChutHttpError(status: number, body: Record<string, unknown>, retryAfter?: string | null): string {
  const apiMessage = typeof body.error === "string" ? body.error : "";
  if (status === 429) {
    const waitHint = retryAfter ? ` Vui lòng thử lại sau ${retryAfter}s.` : " Vui lòng thử lại sau.";
    return `Vượt giới hạn tần suất Một Chút (429).${waitHint}`;
  }
  if (status === 403) {
    return apiMessage || "Mã CTV Một Chút không hợp lệ, đã bị thu hồi hoặc không có quyền cập nhật phim này (403).";
  }
  if (status === 413) {
    return "Dữ liệu gửi lên vượt quá giới hạn 210 KB của Một Chút (413).";
  }
  if (status === 503) {
    return "Hệ thống Một Chút đang bảo trì hoặc tạm bận (503). Vui lòng thử lại sau.";
  }
  return apiMessage || `Một Chút trả về lỗi HTTP ${status}.`;
}

export async function getMotChutConfigStatusAction(): Promise<{ hasEnvCode: boolean }> {
  if (!isDemoMode) {
    await requireAdmin();
  }
  const envCode = process.env.MOTCHUT_CTV_CODE?.trim() ?? "";
  return { hasEnvCode: isValidMotChutCode(envCode) };
}

/**
 * Endpoint B: Lấy danh sách phim đã duyệt & đang chờ duyệt của CTV trên Một Chút (`view=mine`).
 */
export async function getMotChutMineAction(
  codeOverride?: string,
): Promise<{ ok: true; data: MotChutMineResponse } | { ok: false; error: string; status?: number }> {
  if (!isDemoMode) {
    await requireAdmin();
  }

  const code = resolveMotChutCode(codeOverride);
  if (!isValidMotChutCode(code)) {
    return {
      ok: false,
      error: "Chưa có mã CTV Một Chút hợp lệ (32 ký tự). Hãy nhập mã hoặc cấu hình MOTCHUT_CTV_CODE trong .env.local.",
    };
  }

  try {
    const res = await fetch(`${MOTCHUT_API_BASE}?view=mine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: formatMotChutHttpError(res.status, data, res.headers.get("Retry-After")),
      };
    }

    return {
      ok: true,
      data: {
        contributor: String(data.contributor ?? ""),
        movies: Array.isArray(data.movies) ? (data.movies as MotChutMineResponse["movies"]) : [],
        pending: Array.isArray(data.pending) ? (data.pending as MotChutMineResponse["pending"]) : [],
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Không thể kết nối tới Một Chút: ${error.message}`
          : "Không thể kết nối tới máy chủ Một Chút.",
    };
  }
}

/**
 * Endpoint A & C: Đăng phim mới (`view=submit`) hoặc Cập nhật / Nối mùa mới (`updateFor` + `updateMode`).
 */
export async function submitToMotChutAction(
  input: MotChutSubmitInput,
  codeOverride?: string,
): Promise<{ ok: true; data: MotChutSubmitResponse } | { ok: false; error: string; status?: number }> {
  if (!isDemoMode) {
    await requireAdmin();
  }

  const code = resolveMotChutCode(codeOverride);
  const validated = validateAndBuildMotChutPayload(input, code);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  try {
    const res = await fetch(`${MOTCHUT_API_BASE}?view=submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated.payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: formatMotChutHttpError(res.status, data, res.headers.get("Retry-After")),
      };
    }

    return {
      ok: true,
      data: {
        id: String(data.id ?? ""),
        status: String(data.status ?? "pending"),
        message: String(
          data.message ?? "Đã gửi sang Một Chút thành công. Bài đang chờ admin Một Chút kiểm duyệt.",
        ),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Không thể kết nối tới Một Chút: ${error.message}`
          : "Không thể kết nối tới máy chủ Một Chút.",
    };
  }
}

/**
 * Lấy danh sách tập hiện có của 1 phim trong hệ thống để điền sẵn `parts` khi sửa phim.
 */
export async function getMovieEpisodesForMotChutAction(
  movieId: string,
): Promise<{ parts: MotChutPart[] }> {
  if (!isDemoMode) {
    await requireAdmin();
  }
  if (!movieId) return { parts: [] };

  try {
    const store = await getStore();
    const episodes = await store.listEpisodes(movieId);
    const parts: MotChutPart[] = [];

    for (const ep of episodes) {
      const converted = sourcesToMotChutParts(
        ep.title,
        ep.episodeNumber,
        ep.sources.map((s) => ({
          provider: s.provider,
          sourceUrl: s.sourceUrl,
          label: s.label,
        })),
      );
      for (const p of converted) {
        if ((p.fbUrl && p.fbUrl.trim()) || (p.ytUrl && p.ytUrl.trim())) {
          parts.push(p);
        }
      }
      if (parts.length >= 30) break;
    }

    return { parts: parts.slice(0, 30) };
  } catch {
    return { parts: [] };
  }
}
