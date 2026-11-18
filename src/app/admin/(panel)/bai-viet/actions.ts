"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { invalidatePublicCache } from "@/lib/cache";
import { isDemoMode } from "@/lib/env";
import { slugify } from "@/lib/slug";
import { fieldErrors, postSchema } from "@/lib/validations/schemas";
import type { ActionState } from "@/lib/validations/action-state";

function readPostForm(formData: FormData) {
  return {
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    excerpt: formData.get("excerpt") ?? "",
    content: formData.get("content") ?? "",
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    type: formData.get("type") ?? "announcement",
    status: formData.get("status") ?? "draft",
    weekStart: formData.get("weekStart") ?? "",
    movieIds: formData.getAll("movieIds").map(String),
  };
}

export async function createPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return { error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu bài viết." };
  }

  await requireAdmin();

  const parsed = postSchema.safeParse(readPostForm(formData));
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  const store = await getStore();
  const data = parsed.data;

  try {
    await store.createPost({
      slug: data.slug || slugify(data.title),
      title: data.title,
      excerpt: data.excerpt || null,
      content: data.content,
      coverImageUrl: data.coverImageUrl || null,
      type: data.type,
      status: data.status,
      weekStart: data.weekStart || null,
      movieIds: data.movieIds,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể tạo bài viết. Slug có thể đã tồn tại.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/bai-viet");
  revalidatePath("/admin/bai-viet");
  return { success: `Đã tạo bài viết “${data.title}” thành công.` };
}

export async function updatePostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return { error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu thay đổi." };
  }

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu định danh bài viết." };

  const parsed = postSchema.safeParse(readPostForm(formData));
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  const store = await getStore();
  const data = parsed.data;

  try {
    await store.updatePost(id, {
      slug: data.slug || slugify(data.title),
      title: data.title,
      excerpt: data.excerpt || null,
      content: data.content,
      coverImageUrl: data.coverImageUrl || null,
      type: data.type,
      status: data.status,
      weekStart: data.weekStart || null,
      movieIds: data.movieIds,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể cập nhật bài viết. Slug có thể đã tồn tại.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/bai-viet");
  revalidatePath(`/bai-viet/${data.slug}`);
  revalidatePath("/admin/bai-viet");
  revalidatePath(`/admin/bai-viet/${id}/edit`);
  return { success: `Đã cập nhật bài viết “${data.title}” thành công.` };
}

export async function deletePostAction(formData: FormData): Promise<void> {
  if (isDemoMode) return;

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!id || confirm !== id) return;

  const store = await getStore();
  await store.deletePost(id);

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/bai-viet");
  revalidatePath("/admin/bai-viet");
}
