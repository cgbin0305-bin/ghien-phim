"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { invalidatePublicCache } from "@/lib/cache";
import { isDemoMode } from "@/lib/env";
import { slugify } from "@/lib/slug";
import { fieldErrors, movieSchema, type MovieFormOutput } from "@/lib/validations/schemas";
import type { ActionState } from "@/lib/validations/action-state";
import type { MovieInput } from "@/lib/data/types";
import type { MovieWithStats } from "@/lib/types";

function readMovieForm(formData: FormData) {
  return {
    title: formData.get("title"),
    originalTitle: formData.get("originalTitle") ?? "",
    slug: formData.get("slug") ?? "",
    synopsis: formData.get("synopsis") ?? "",
    posterUrl: formData.get("posterUrl") ?? "",
    backdropUrl: formData.get("backdropUrl") ?? "",
    status: formData.get("status") ?? "draft",
    releaseStatus: formData.get("releaseStatus") ?? "upcoming",
    genreIds: formData.getAll("genreIds").map(String),
  };
}

/**
 * Maps the validated form onto the store's `MovieInput`.
 *
 * Fields the form no longer exposes (year, director, cast, trailer, subtitle
 * label, featured flag, episode count, sort order) are preserved from the
 * existing movie when updating, and defaulted when creating.
 */
function toMovieInput(
  data: MovieFormOutput,
  existing?: MovieWithStats | null,
): MovieInput {
  return {
    slug: data.slug || slugify(data.title),
    title: data.title,
    originalTitle: data.originalTitle || null,
    synopsis: data.synopsis || null,
    year: existing?.year ?? null,
    country: existing?.country ?? "Trung Quốc",
    director: existing?.director ?? null,
    cast: existing?.cast ?? [],
    posterUrl: data.posterUrl || null,
    backdropUrl: data.backdropUrl || null,
    trailerUrl: existing?.trailerUrl ?? null,
    status: data.status,
    releaseStatus: data.releaseStatus,
    totalEpisodes: existing?.totalEpisodes ?? null,
    subtitleLabel: existing?.subtitleLabel ?? null,
    isFeatured: existing?.isFeatured ?? false,
    // `undefined` khi tạo mới: store sẽ tự đặt phim vào cuối danh sách.
    sortOrder: existing?.sortOrder,
    genreIds: data.genreIds,
  };
}

/**
 * Creates a new movie.
 *
 * Requires an admin session on the server. In demo mode the action refuses to
 * pretend that data was saved.
 */
export async function createMovieAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return {
      error:
        "Chế độ demo: chưa cấu hình Supabase nên không thể lưu phim. Hãy cấu hình biến môi trường và chạy migration.",
    };
  }

  await requireAdmin();

  const parsed = movieSchema.safeParse(readMovieForm(formData));
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  const store = await getStore();
  const data = parsed.data;

  let createdId = "";
  try {
    const created = await store.createMovie(toMovieInput(data));
    createdId = created.id;
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể tạo phim. Slug có thể đã tồn tại.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/phim");
  revalidatePath("/admin/phim");
  revalidatePath(`/admin/phim/${createdId}/episodes`);
  return {
    success: `Đã tạo phim “${data.title}” thành công. Đang chuyển sang trang thêm tập phim…`,
    redirectTo: `/admin/phim/${createdId}/episodes`,
  };
}

export async function updateMovieAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return { error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu thay đổi." };
  }

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu định danh phim." };

  const parsed = movieSchema.safeParse(readMovieForm(formData));
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  const store = await getStore();
  const data = parsed.data;
  const existing = await store.getMovieById(id);

  try {
    await store.updateMovie(id, toMovieInput(data, existing));
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể cập nhật phim. Slug có thể đã tồn tại.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath(`/phim/${data.slug}`);
  revalidatePath("/phim");
  revalidatePath("/admin/phim");
  revalidatePath(`/admin/phim/${id}/edit`);
  return { success: `Đã cập nhật phim “${data.title}” thành công.` };
}

/**
 * Deletes a movie and cascades to its episodes and video sources.
 *
 * The UI prefers archiving (setting status to draft) for movies that already
 * have episodes; deletion is available but always behind a confirmation.
 */
export async function deleteMovieAction(formData: FormData): Promise<void> {
  if (isDemoMode) return;

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!id || confirm !== id) return;

  const store = await getStore();
  await store.deleteMovie(id);

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/phim");
  revalidatePath("/admin/phim");
}

export async function toggleMovieFeaturedAction(formData: FormData): Promise<void> {
  if (isDemoMode) return;

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const store = await getStore();
  const movie = await store.getMovieById(id);
  if (!movie) return;

  await store.updateMovie(id, {
    slug: movie.slug,
    title: movie.title,
    originalTitle: movie.originalTitle,
    synopsis: movie.synopsis,
    year: movie.year,
    country: movie.country,
    director: movie.director,
    cast: movie.cast ?? [],
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    trailerUrl: movie.trailerUrl,
    status: movie.status,
    releaseStatus: movie.releaseStatus,
    totalEpisodes: movie.totalEpisodes,
    subtitleLabel: movie.subtitleLabel,
    isFeatured: !movie.isFeatured,
    sortOrder: movie.sortOrder,
    genreIds: movie.genres.map((g) => g.id),
  });

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/admin/phim");
}