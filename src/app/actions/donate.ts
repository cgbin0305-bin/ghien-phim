"use server";

import { getStore } from "@/lib/data";
import {
  DONATE_CONFIG,
  normalizeDonateConfig,
  type DonateConfig,
} from "@/config/donateConfig";

/**
 * Nạp cấu hình Donate / Thưởng Linh Thạch mới nhất trực tiếp từ cơ sở dữ liệu
 * (bỏ qua mọi lớp cache tĩnh của trình duyệt và Next.js Router Cache) để khi
 * Admin vừa bấm Lưu trong /admin/cai-dat rồi mở trang xem phim, popup luôn
 * hiển thị ngay thông tin chuyển khoản mới nhất.
 */
export async function getLatestDonateConfigAction(): Promise<DonateConfig> {
  try {
    const store = await getStore();
    const settings = await store.getSettings();
    return normalizeDonateConfig(settings.donateConfig ?? DONATE_CONFIG);
  } catch {
    return { ...DONATE_CONFIG };
  }
}
