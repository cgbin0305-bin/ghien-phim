import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/supabase/public";
import { ttlCacheClear } from "@/lib/data/ttl-cache";

/**
 * Xoá cache của dữ liệu công khai.
 *
 * Các trang công khai đọc dữ liệu qua client ẩn danh, dùng Next.js Data
 * Cache (`next.revalidate` + `next.tags`) cho các route tĩnh và cache TTL trong
 * bộ nhớ cho các route động. Khi quản trị viên sửa nội dung ta gọi hàm này
 * để cả hai lớp cache được làm mới ngay lập tức thay vì chờ hết hạn.
 */
export function invalidatePublicCache(): void {
  for (const tag of Object.values(CACHE_TAGS)) {
    revalidateTag(tag);
  }

  // Xoá cache TTL trong bộ nhớ.
  ttlCacheClear();
}

/**
 * Xoá cache và làm mới các đường dẫn liên quan.
 *
 * `revalidatePath` giữ cho các route đã render tĩnh (ISR) được dựng lại,
 * còn `revalidateTag` giữ cho Data Cache của các request PostgREST.
 */
export function refreshPublicContent(paths: string[] = ["/"]): void {
  invalidatePublicCache();
  for (const path of paths) {
    revalidatePath(path);
  }
}
