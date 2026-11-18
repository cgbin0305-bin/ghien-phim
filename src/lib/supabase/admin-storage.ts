import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Service-role client dùng cho thao tác lên Supabase Storage.
 *
 * Storage policy chỉ cho phép `authenticated` có role admin ghi, nhưng tải ảnh
 * lên xảy ra từ Server Action nơi session đã được `requireAdmin()` kiểm tra.
 * Dùng service role ở đây giúp việc upload không phụ thuộc vào việc token
 * phiên có được truyền xuống Storage API hay không.
 *
 * Module này được bảo vệ bởi `server-only` nên key không lọt vào client bundle.
 */
export function getAdminClient() {
  return createAdminClient();
}
