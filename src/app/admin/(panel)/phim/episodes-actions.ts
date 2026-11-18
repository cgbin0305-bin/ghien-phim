"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { invalidatePublicCache } from "@/lib/cache";
import { isDemoMode } from "@/lib/env";
import { slugify } from "@/lib/slug";
import { fieldErrors, episodeSchema } from "@/lib/validations/schemas";
import { parseVideoUrl } from "@/lib/video/provider";
import type { ActionState } from "@/lib/validations/action-state";
import type { VideoProvider } from "@/lib/types";

interface ParsedSource {
  id?: string;
  provider: VideoProvider;
  sourceUrl: string;
  label: string;
  priority: number;
}

/**
 * Reads the repeated `sourceUrl` / `sourceProvider` / `sourceLabel` fields
 * posted by the episode form and validates every URL through the provider
 * layer. A single invalid URL rejects the whole submission, so an episode can
 * never be published with a broken or untrusted source.
 */
function readSources(formData: FormData): { sources: ParsedSource[]; error?: string } {
  const urls = formData.getAll("sourceUrl").map(String);
  const providers = formData.getAll("sourceProvider").map(String);
  const labels = formData.getAll("sourceLabel").map(String);
  const ids = formData.getAll("sourceId").map(String);

  const sources: ParsedSource[] = [];

  for (let i = 0; i < urls.length; i += 1) {
    const raw = urls[i]!.trim();
    if (!raw) continue;

    const parsed = parseVideoUrl(raw);
    if (!parsed.ok) {
      return {
        sources: [],
        error: parsed.hint
          ? `Nguồn video ${i + 1}: ${parsed.error} ${parsed.hint}`
          : `Nguồn video ${i + 1}: ${parsed.error}`,
      };
    }

    const declaredProvider = providers[i] as VideoProvider | undefined;
    if (
      declaredProvider &&
      declaredProvider !== parsed.video.provider &&
      parsed.video.provider !== declaredProvider
    ) {
      return {
        sources: [],
        error: `Nguồn video ${i + 1}: URL thuộc ${parsed.video.provider} nhưng đang chọn ${declaredProvider}.`,
      };
    }

    sources.push({
      id: ids[i] || undefined,
      provider: parsed.video.provider,
      sourceUrl: raw,
      label: labels[i]?.trim() || `Nguồn ${sources.length + 1}`,
      priority: sources.length,
    });
  }

  return { sources };
}

export async function createEpisodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return { error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu tập." };
  }

  await requireAdmin();

  const movieId = String(formData.get("movieId") ?? "");
  const status = formData.get("status") === "published" ? "published" : "draft";

  const { sources, error: sourceError } = readSources(formData);
  if (sourceError) return { error: sourceError };

  const parsed = episodeSchema.safeParse({
    movieId,
    episodeNumber: formData.get("episodeNumber") ?? "",
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    releaseDate: formData.get("releaseDate") ?? "",
    status,
    description: formData.get("description") ?? "",
    sources,
  });

  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  if (parsed.data.status === "published" && parsed.data.sources.length === 0) {
    return {
      error: "Không thể xuất bản tập chưa có nguồn video hợp lệ.",
      fieldErrors: { "sources.0.sourceUrl": "Cần ít nhất một nguồn video hợp lệ." },
    };
  }

  const store = await getStore();
  const data = parsed.data;

  try {
    await store.createEpisode({
      movieId: data.movieId,
      episodeNumber: data.episodeNumber,
      title: data.title,
      slug: data.slug || slugify(data.title),
      releaseDate: data.releaseDate || null,
      status: data.status,
      description: data.description || null,
      sources: data.sources.map((s, index) => ({
        id: s.id,
        provider: s.provider,
        sourceUrl: s.sourceUrl,
        label: s.label,
        priority: index,
      })),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể tạo tập. Số tập có thể đã tồn tại.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/phim");
  revalidatePath(`/admin/phim/${movieId}`);
  revalidatePath(`/admin/phim/${movieId}/episodes`);
  return { success: `Đã thêm Tập ${data.episodeNumber} (“${data.title}”) thành công.` };
}

export async function updateEpisodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return { error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu thay đổi." };
  }

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const movieId = String(formData.get("movieId") ?? "");
  if (!id) return { error: "Thiếu định danh tập." };

  const { sources, error: sourceError } = readSources(formData);
  if (sourceError) return { error: sourceError };

  const parsed = episodeSchema.safeParse({
    movieId,
    episodeNumber: formData.get("episodeNumber") ?? "",
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    releaseDate: formData.get("releaseDate") ?? "",
    status: formData.get("status") ?? "draft",
    description: formData.get("description") ?? "",
    sources,
  });

  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  if (parsed.data.status === "published" && parsed.data.sources.length === 0) {
    return {
      error: "Không thể xuất bản tập chưa có nguồn video hợp lệ.",
      fieldErrors: { "sources.0.sourceUrl": "Cần ít nhất một nguồn video hợp lệ." },
    };
  }

  const store = await getStore();
  const data = parsed.data;

  try {
    await store.updateEpisode(id, {
      movieId: data.movieId,
      episodeNumber: data.episodeNumber,
      title: data.title,
      slug: data.slug || slugify(data.title),
      releaseDate: data.releaseDate || null,
      status: data.status,
      description: data.description || null,
      sources: data.sources.map((s, index) => ({
        id: s.id,
        provider: s.provider,
        sourceUrl: s.sourceUrl,
        label: s.label,
        priority: index,
      })),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể cập nhật tập. Số tập có thể đã tồn tại.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/phim");
  revalidatePath(`/admin/phim/${movieId}`);
  revalidatePath(`/admin/phim/${movieId}/episodes`);
  return { success: `Đã cập nhật Tập ${data.episodeNumber} (“${data.title}”) thành công.` };
}

export async function deleteEpisodeAction(formData: FormData): Promise<void> {
  if (isDemoMode) return;

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const movieId = String(formData.get("movieId") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!id || !movieId || confirm !== id) return;

  const store = await getStore();
  await store.deleteEpisode(id);

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/phim");
  revalidatePath(`/admin/phim/${movieId}`);
  revalidatePath(`/admin/phim/${movieId}/episodes`);
}

export async function toggleEpisodeStatusAction(formData: FormData): Promise<void> {
  if (isDemoMode) return;

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const movieId = String(formData.get("movieId") ?? "");
  if (!id || !movieId) return;

  const store = await getStore();
  const episodes = await store.listEpisodes(movieId);
  const episode = episodes.find((e) => e.id === id);
  if (!episode) return;

  const nextStatus = episode.status === "published" ? "draft" : "published";
  if (nextStatus === "published" && episode.sources.length === 0) return;

  await store.updateEpisode(id, {
    movieId,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    slug: episode.slug,
    releaseDate: episode.releaseDate,
    status: nextStatus,
    description: episode.description,
    sources: episode.sources.map((s) => ({
      id: s.id,
      provider: s.provider,
      sourceUrl: s.sourceUrl,
      label: s.label,
      priority: s.priority,
    })),
  });

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/phim");
  revalidatePath(`/admin/phim/${movieId}/episodes`);
}