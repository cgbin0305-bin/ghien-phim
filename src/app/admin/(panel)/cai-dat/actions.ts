"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { invalidatePublicCache } from "@/lib/cache";
import { isDemoMode } from "@/lib/env";
import { fieldErrors, settingsSchema } from "@/lib/validations/schemas";
import type { ActionState } from "@/lib/validations/action-state";

/**
 * Updates the site settings.
 *
 * There is deliberately no UI for editing environment variables or secrets -
 * only public, editorial settings live here.
 */
export async function updateSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return {
      error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu cài đặt.",
    };
  }

  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    siteName: formData.get("siteName"),
    siteDescription: formData.get("siteDescription") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    contactNote: formData.get("contactNote") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    ogImageUrl: formData.get("ogImageUrl") ?? "",
    featuredMovieId: formData.get("featuredMovieId") ?? "",
  });

  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  const store = await getStore();
  const data = parsed.data;

  try {
    await store.updateSettings({
      siteName: data.siteName,
      siteDescription: data.siteDescription || null,
      logoUrl: data.logoUrl || null,
      contactEmail: data.contactEmail || null,
      contactNote: data.contactNote || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      ogImageUrl: data.ogImageUrl || null,
      featuredMovieId: data.featuredMovieId || null,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể lưu cài đặt.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/admin/cai-dat");

  return { success: "Đã lưu cài đặt." };
}
