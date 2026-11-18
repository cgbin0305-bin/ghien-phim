"use server";

import { revalidatePath } from "next/cache";
import { isDemoMode } from "@/lib/env";
import { isUuid } from "@/lib/data/uuid";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export type ReactionKey = "tuyet_pham" | "dao_huu" | "hong_tap" | "cam_dong";

export type ReactionCounts = {
  tuyet_pham: number;
  dao_huu: number;
  hong_tap: number;
  cam_dong: number;
};

export interface MovieCommunityStats {
  movieId: string;
  views: number;
  reactions: ReactionCounts;
}

export interface BrokenEpisodeReport {
  id: string;
  movieId: string;
  episodeId: string;
  movieSlug: string;
  movieTitle: string;
  episodeSlug: string;
  episodeTitle: string;
  serverLabel: string | null;
  note: string | null;
  status: "pending" | "resolved";
  createdAt: string;
}

interface CommunityFallbackStore {
  statsByMovieId: Map<string, MovieCommunityStats>;
  brokenReports: BrokenEpisodeReport[];
}

const globalForCommunity = globalThis as unknown as {
  __gheienphimCommunityStore?: CommunityFallbackStore;
};

function getFallbackStore(): CommunityFallbackStore {
  if (!globalForCommunity.__gheienphimCommunityStore) {
    globalForCommunity.__gheienphimCommunityStore = {
      statsByMovieId: new Map<string, MovieCommunityStats>(),
      brokenReports: [],
    };
  }
  return globalForCommunity.__gheienphimCommunityStore;
}

const DEFAULT_REACTIONS: ReactionCounts = {
  tuyet_pham: 0,
  dao_huu: 0,
  hong_tap: 0,
  cam_dong: 0,
};

function normalizeReactions(raw: unknown): ReactionCounts {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_REACTIONS };
  const obj = raw as Record<string, unknown>;
  return {
    tuyet_pham: Math.max(0, Number(obj.tuyet_pham) || 0),
    dao_huu: Math.max(0, Number(obj.dao_huu) || 0),
    hong_tap: Math.max(0, Number(obj.hong_tap) || 0),
    cam_dong: Math.max(0, Number(obj.cam_dong) || 0),
  };
}

/**
 * Đọc số lượt xem và cảm xúc của danh sách phim với cơ chế Graceful Fallback:
 * Nếu cột `views` hoặc `reactions` chưa được thêm vào Supabase, hàm tự động
 * trả về dữ liệu kết hợp từ bộ nhớ đệm mà không bao giờ văng lỗi.
 */
export async function getMoviesCommunityStats(
  movieIds: string[],
): Promise<Record<string, MovieCommunityStats>> {
  const fallback = getFallbackStore();
  const result: Record<string, MovieCommunityStats> = {};

  for (const id of movieIds) {
    const mem = fallback.statsByMovieId.get(id);
    result[id] = mem
      ? {
          movieId: id,
          views: mem.views,
          reactions: { ...mem.reactions },
        }
      : {
          movieId: id,
          views: 0,
          reactions: { ...DEFAULT_REACTIONS },
        };
  }

  if (isDemoMode || movieIds.length === 0) {
    return result;
  }

  const validUuidIds = movieIds.filter(isUuid);
  if (validUuidIds.length === 0) {
    return result;
  }

  try {
    const client = createPublicClient();
    const { data, error } = await client
      .from("movies")
      .select("id, views, reactions")
      .in("id", validUuidIds);

    if (!error && Array.isArray(data)) {
      for (const row of data as unknown as Array<{
        id: string;
        views?: number | null;
        reactions?: unknown;
      }>) {
        const mem = fallback.statsByMovieId.get(row.id);
        const dbViews = Math.max(0, Number(row.views) || 0);
        const dbReactions = normalizeReactions(row.reactions);

        result[row.id] = {
          movieId: row.id,
          views: Math.max(dbViews, mem?.views ?? 0),
          reactions: {
            tuyet_pham: Math.max(dbReactions.tuyet_pham, mem?.reactions.tuyet_pham ?? 0),
            dao_huu: Math.max(dbReactions.dao_huu, mem?.reactions.dao_huu ?? 0),
            hong_tap: Math.max(dbReactions.hong_tap, mem?.reactions.hong_tap ?? 0),
            cam_dong: Math.max(dbReactions.cam_dong, mem?.reactions.cam_dong ?? 0),
          },
        };
      }
    }
  } catch {
    // Graceful fallback: cột views/reactions chưa được tạo trên Supabase.
  }

  return result;
}

/**
 * Tăng +1 lượt xem cho bộ phim (chạy ngầm non-blocking, có try/catch an toàn).
 */
export async function incrementMovieViewAction(movieId: string): Promise<{ views: number }> {
  const fallback = getFallbackStore();
  const current = fallback.statsByMovieId.get(movieId) ?? {
    movieId,
    views: 0,
    reactions: { ...DEFAULT_REACTIONS },
  };
  current.views += 1;
  fallback.statsByMovieId.set(movieId, current);

  if (isDemoMode || !isUuid(movieId)) {
    return { views: current.views };
  }

  try {
    const client = await createClient();
    // Ưu tiên gọi RPC nếu đã chạy file SQL nâng cấp
    const { data: rpcViews, error: rpcError } = await client.rpc("increment_movie_view", {
      target_movie_id: movieId,
    });

    if (!rpcError && typeof rpcViews === "number") {
      current.views = Math.max(current.views, rpcViews);
      fallback.statsByMovieId.set(movieId, current);
      return { views: current.views };
    }

    // Fallback thứ 2: đọc và update trực tiếp cột `views` nếu có quyền
    const { data: row } = await client
      .from("movies")
      .select("views")
      .eq("id", movieId)
      .maybeSingle();

    if (row && typeof (row as { views?: unknown }).views === "number") {
      const nextViews = Number((row as { views: number }).views) + 1;
      await client.from("movies").update({ views: nextViews }).eq("id", movieId);
      current.views = Math.max(current.views, nextViews);
      fallback.statsByMovieId.set(movieId, current);
    }
  } catch {
    // Graceful fallback: không báo lỗi nếu DB chưa có cột views / RPC.
  }

  return { views: current.views };
}

/**
 * Tăng +1 cảm xúc cổ phong cho bộ phim (chạy ngầm non-blocking, có try/catch an toàn).
 */
export async function incrementMovieReactionAction(
  movieId: string,
  reactionKey: ReactionKey,
): Promise<{ reactions: ReactionCounts }> {
  const validKeys: ReactionKey[] = ["tuyet_pham", "dao_huu", "hong_tap", "cam_dong"];
  if (!validKeys.includes(reactionKey)) {
    return { reactions: { ...DEFAULT_REACTIONS } };
  }

  const fallback = getFallbackStore();
  const current = fallback.statsByMovieId.get(movieId) ?? {
    movieId,
    views: 0,
    reactions: { ...DEFAULT_REACTIONS },
  };
  current.reactions[reactionKey] = (current.reactions[reactionKey] ?? 0) + 1;
  fallback.statsByMovieId.set(movieId, current);

  if (isDemoMode || !isUuid(movieId)) {
    return { reactions: current.reactions };
  }

  try {
    const client = await createClient();
    const { data: rpcReactions, error: rpcError } = await client.rpc("increment_movie_reaction", {
      target_movie_id: movieId,
      reaction_key: reactionKey,
    });

    if (!rpcError && rpcReactions) {
      const normalized = normalizeReactions(rpcReactions);
      current.reactions = {
        tuyet_pham: Math.max(current.reactions.tuyet_pham, normalized.tuyet_pham),
        dao_huu: Math.max(current.reactions.dao_huu, normalized.dao_huu),
        hong_tap: Math.max(current.reactions.hong_tap, normalized.hong_tap),
        cam_dong: Math.max(current.reactions.cam_dong, normalized.cam_dong),
      };
      fallback.statsByMovieId.set(movieId, current);
      return { reactions: current.reactions };
    }

    const { data: row } = await client
      .from("movies")
      .select("reactions")
      .eq("id", movieId)
      .maybeSingle();

    if (row) {
      const existing = normalizeReactions((row as { reactions?: unknown }).reactions);
      existing[reactionKey] += 1;
      await client.from("movies").update({ reactions: existing }).eq("id", movieId);
      current.reactions = existing;
      fallback.statsByMovieId.set(movieId, current);
    }
  } catch {
    // Graceful fallback: giữ nguyên dữ liệu trong bộ nhớ nếu DB chưa có cột reactions.
  }

  return { reactions: current.reactions };
}

/**
 * Gửi báo cáo lỗi tập phim / link hỏng từ người xem.
 * Luôn lưu vào bộ nhớ đệm VÀ thử ghi vào bảng `broken_reports` trên Supabase.
 */
export async function reportBrokenEpisodeAction(input: {
  movieId: string;
  episodeId: string;
  movieSlug: string;
  movieTitle: string;
  episodeSlug: string;
  episodeTitle: string;
  serverLabel?: string;
  note?: string;
}): Promise<{ ok: boolean; message: string }> {
  const fallback = getFallbackStore();

  const report: BrokenEpisodeReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    movieId: input.movieId,
    episodeId: input.episodeId,
    movieSlug: input.movieSlug,
    movieTitle: input.movieTitle,
    episodeSlug: input.episodeSlug,
    episodeTitle: input.episodeTitle,
    serverLabel: input.serverLabel?.trim() || null,
    note: input.note?.trim() || null,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  // Tránh trùng lặp liên tiếp cùng 1 tập trong danh sách chờ xử lý
  const existsInMem = fallback.brokenReports.some(
    (r) =>
      r.episodeId === report.episodeId &&
      r.status === "pending" &&
      r.serverLabel === report.serverLabel,
  );
  if (!existsInMem) {
    fallback.brokenReports.unshift(report);
    if (fallback.brokenReports.length > 50) {
      fallback.brokenReports.length = 50;
    }
  }

  if (!isDemoMode && isUuid(input.movieId) && isUuid(input.episodeId)) {
    try {
      const client = await createClient();
      await client.from("broken_reports").insert({
        movie_id: input.movieId,
        episode_id: input.episodeId,
        movie_slug: input.movieSlug,
        movie_title: input.movieTitle,
        episode_slug: input.episodeSlug,
        episode_title: input.episodeTitle,
        server_label: report.serverLabel,
        note: report.note,
        status: "pending",
      });
    } catch {
      // Graceful fallback: bảng broken_reports chưa được tạo trên Supabase,
      // dữ liệu vẫn được lưu trong bộ nhớ server để hiển thị trên Admin Dashboard.
    }
  }

  revalidatePath("/admin");
  return {
    ok: true,
    message: "Đã gửi báo lỗi tập phim tới Quản trị viên.",
  };
}

/**
 * Lấy danh sách các tập phim bị người dùng báo lỗi để hiển thị trên Admin Dashboard.
 */
export async function listBrokenReportsForAdmin(): Promise<BrokenEpisodeReport[]> {
  const fallback = getFallbackStore();
  const combined = new Map<string, BrokenEpisodeReport>();

  for (const item of fallback.brokenReports) {
    if (item.status === "pending") {
      combined.set(`${item.episodeId}-${item.serverLabel ?? ""}`, item);
    }
  }

  if (!isDemoMode) {
    try {
      const client = await createClient();
      const { data, error } = await client
        .from("broken_reports")
        .select(
          "id, movie_id, episode_id, movie_slug, movie_title, episode_slug, episode_title, server_label, note, status, created_at",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && Array.isArray(data)) {
        for (const row of data as unknown as Array<{
          id: string;
          movie_id: string;
          episode_id: string;
          movie_slug: string;
          movie_title: string;
          episode_slug: string;
          episode_title: string;
          server_label: string | null;
          note: string | null;
          status: "pending" | "resolved";
          created_at: string;
        }>) {
          combined.set(`${row.episode_id}-${row.server_label ?? ""}`, {
            id: row.id,
            movieId: row.movie_id,
            episodeId: row.episode_id,
            movieSlug: row.movie_slug,
            movieTitle: row.movie_title,
            episodeSlug: row.episode_slug,
            episodeTitle: row.episode_title,
            serverLabel: row.server_label,
            note: row.note,
            status: row.status,
            createdAt: row.created_at,
          });
        }
      }
    } catch {
      // Graceful fallback khi bảng broken_reports chưa tồn tại.
    }
  }

  return Array.from(combined.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

/**
 * Đánh dấu đã xử lý một báo cáo lỗi tập phim trên Admin Dashboard.
 */
export async function resolveBrokenReportAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const episodeId = String(formData.get("episodeId") ?? "");

  const fallback = getFallbackStore();
  for (const item of fallback.brokenReports) {
    if (item.id === id || (episodeId && item.episodeId === episodeId)) {
      item.status = "resolved";
    }
  }

  if (!isDemoMode) {
    try {
      const client = await createClient();
      if (isUuid(id)) {
        await client.from("broken_reports").update({ status: "resolved" }).eq("id", id);
      } else if (isUuid(episodeId)) {
        await client
          .from("broken_reports")
          .update({ status: "resolved" })
          .eq("episode_id", episodeId);
      }
    } catch {
      // Ignore DB error if table does not exist yet.
    }
  }

  revalidatePath("/admin");
}
