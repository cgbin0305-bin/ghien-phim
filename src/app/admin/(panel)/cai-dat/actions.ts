"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { invalidatePublicCache } from "@/lib/cache";
import { isDemoMode } from "@/lib/env";
import { normalizeDonateConfig } from "@/config/donateConfig";
import { fieldErrors, settingsSchema } from "@/lib/validations/schemas";
import type { ActionState } from "@/lib/validations/action-state";

/**
 * Updates the site settings (including Donate / Thưởng Linh Thạch configuration).
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
    donateButtonText: formData.get("donateButtonText") ?? "",
    donateTitle: formData.get("donateTitle") ?? "",
    donateMessage: formData.get("donateMessage") ?? "",
    donateBankName: formData.get("donateBankName") ?? "",
    donateAccountNumber: formData.get("donateAccountNumber") ?? "",
    donateAccountHolder: formData.get("donateAccountHolder") ?? "",
    donateTransferContent: formData.get("donateTransferContent") ?? "",
    donateQrImageUrl: formData.get("donateQrImageUrl") ?? "",
  });

  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  const store = await getStore();
  const data = parsed.data;

  const donateConfig = normalizeDonateConfig({
    buttonText: data.donateButtonText,
    title: data.donateTitle,
    message: data.donateMessage,
    bankName: data.donateBankName,
    accountNumber: data.donateAccountNumber,
    accountHolder: data.donateAccountHolder,
    transferContent: data.donateTransferContent,
    qrImageUrl: data.donateQrImageUrl,
  });

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
      donateConfig,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể lưu cài đặt.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/cai-dat");
  revalidatePath("/xem/[movieSlug]/[episodeSlug]", "page");

  return { success: "Đã lưu cài đặt website và thông tin chuyển khoản thành công." };
}
