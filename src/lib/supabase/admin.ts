import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { siteConfig } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS, therefore it is only used for narrowly
 * scoped administrative operations (e.g. verifying the admin role list) and
 * never for public reads.
 *
 * The key lives only in this module, which is guarded by `server-only`, so it
 * cannot end up in the client bundle.
 */
export function createAdminClient() {
  if (!siteConfig.serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình.");
  }
  return createClient<Database>(siteConfig.url!, siteConfig.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
