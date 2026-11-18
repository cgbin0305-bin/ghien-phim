"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { invalidatePublicCache } from "@/lib/cache";
import { isDemoMode } from "@/lib/env";
import { fieldErrors, genreSchema } from "@/lib/validations/schemas";
import type { ActionState } from "@/lib/validations/action-state";
import type { Genre } from "@/lib/types";

export interface GenreActionState extends ActionState {
  genre?: Genre;
}

function readGenreForm(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    sortOrder: formData.get("sortOrder") ?? "",
  };
}

function revalidateGenrePaths() {
  invalidatePublicCache();
  revalidatePath("/");
  revalidatePath("/phim");
  revalidatePath("/admin");
  revalidatePath("/admin/the-loai");
  revalidatePath("/admin/phim");
  revalidatePath("/admin/phim/new");
}

export async function createGenreAction(
  _prev: GenreActionState,
  formData: FormData,
): Promise<GenreActionState> {
  if (isDemoMode) {
    return {
      error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu thể loại mới.",
    };
  }

  await requireAdmin();

  const raw = readGenreForm(formData);
  const parsed = genreSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Vui lòng kiểm tra lại các trường thông tin thể loại.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const store = await getStore();
  const data = parsed.data;

  try {
    const genre = await store.createGenre({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      sortOrder: data.sortOrder ?? null,
    });

    revalidateGenrePaths();
    return {
      success: `Đã thêm thể loại “${genre.name}” thành công.`,
      genre,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể thêm thể loại.",
    };
  }
}

export async function updateGenreAction(
  _prev: GenreActionState,
  formData: FormData,
): Promise<GenreActionState> {
  if (isDemoMode) {
    return {
      error: "Chế độ demo: chưa cấu hình Supabase nên không thể cập nhật thể loại.",
    };
  }

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Thiếu định danh thể loại cần cập nhật." };
  }

  const raw = readGenreForm(formData);
  const parsed = genreSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Vui lòng kiểm tra lại các trường thông tin thể loại.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const store = await getStore();
  const data = parsed.data;

  try {
    const genre = await store.updateGenre(id, {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      sortOrder: data.sortOrder ?? null,
    });

    revalidateGenrePaths();
    return {
      success: `Đã cập nhật thể loại “${genre.name}” thành công.`,
      genre,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể cập nhật thể loại.",
    };
  }
}

export async function deleteGenreAction(formData: FormData): Promise<void> {
  if (isDemoMode) return;

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!id || confirm !== id) return;

  const store = await getStore();
  await store.deleteGenre(id);

  revalidateGenrePaths();
}
