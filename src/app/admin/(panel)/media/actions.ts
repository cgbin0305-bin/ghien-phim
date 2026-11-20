"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode, siteConfig } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin-storage";
import { createClient } from "@/lib/supabase/server";

/** Bucket lưu ảnh công khai (xem `supabase/migrations/003_storage.sql`). */
const BUCKET = "media";

/** Kích thước tối đa cho ảnh poster/backdrop (5 MB, khớp giới hạn bucket). */
const MAX_BYTES = 5 * 1024 * 1024;

/** Chỉ chấp nhận ảnh raster. SVG bị loại vì có thể chứa script. */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export interface UploadImageResult {
  success?: string;
  error?: string;
  /** URL công khai của ảnh vừa tải lên. */
  url?: string;
}

/**
 * Tải ảnh lên Supabase Storage và trả về URL công khai.
 *
 * Admin không cần biết URL ảnh: chọn file trên máy, ảnh được upload vào
 * bucket `media` và form tự điền URL. Việc này loại bỏ nguyên nhân gây lỗi
 * "Invalid src prop ... hostname is not configured" — vì URL luôn trỏ tới
 * `*.supabase.co`, host đã nằm trong `images.remotePatterns`.
 */
export async function uploadImageAction(formData: FormData): Promise<UploadImageResult> {
  if (isDemoMode) {
    return { error: "Chế độ demo: chưa cấu hình Supabase nên không thể tải ảnh lên." };
  }

  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Chưa chọn file ảnh." };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      error: "Định dạng ảnh không được hỗ trợ. Chỉ nhận JPG, PNG, WebP hoặc AVIF.",
    };
  }

  if (file.size > MAX_BYTES) {
    return { error: "Ảnh vượt quá 5 MB. Hãy nén ảnh trước khi tải lên." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const fileName = `${safeBase || "image"}-${Date.now()}.${extension}`;

  try {
    const storageClient = siteConfig.serviceRoleKey
      ? getAdminClient()
      : await createClient();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error } = await storageClient.storage
      .from(BUCKET)
      .upload(fileName, fileBuffer, { contentType: file.type, upsert: false });

    if (error) {
      return { error: `Không tải lên được: ${error.message}` };
    }

    const { data } = storageClient.storage.from(BUCKET).getPublicUrl(fileName);

    revalidatePath("/admin/cai-dat");
    return { success: "Đã tải ảnh lên.", url: data.publicUrl };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không tải ảnh lên được.",
    };
  }
}
