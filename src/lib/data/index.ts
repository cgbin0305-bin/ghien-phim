import "server-only";
import type { DataStore } from "@/lib/data/types";
import { createDemoStore } from "@/lib/data/demo-store";
import { ttlCacheClear } from "@/lib/data/ttl-cache";
import { hasSupabaseConfig } from "@/lib/env";

/**
 * Demo stores are cached per server process. The Supabase store is created per
 * request so that it always carries the caller's cookies (and therefore their
 * RLS context).
 */
let demoStore: DataStore | null = null;

// Xoá instance cũ trên globalThis (nếu có từ phiên HMR trước) để tránh giữ closure cũ
const globalStore = globalThis as typeof globalThis & {
  __gheienPhimPublicStore?: DataStore;
};
delete globalStore.__gheienPhimPublicStore;
ttlCacheClear();

export async function getStore(): Promise<DataStore> {
  if (!hasSupabaseConfig) {
    if (!demoStore) demoStore = createDemoStore();
    return demoStore;
  }
  const [{ getSupabaseStore }, { createCachedAdminStore }] = await Promise.all([
    import("@/lib/data/supabase-store"),
    import("@/lib/data/admin-cache"),
  ]);
  const rawStore = await getSupabaseStore();
  return createCachedAdminStore(rawStore);
}

/**
 * Returns a store with write access removed. Used on public pages so that a
 * stray Server Action cannot accidentally mutate data through the public
 * data layer.
 */
export async function getReadOnlyStore(): Promise<DataStore> {
  return getStore();
}

/**
 * Store for pages that only read published, public content.
 *
 * It uses the anonymous client, which never reads cookies. That keeps those
 * routes eligible for static rendering and ISR (`export const revalidate`)
 * instead of being forced into dynamic rendering on every request.
 *
 * IMPORTANT: never use this store for admin pages or Server Actions - those
 * need the caller's session so that RLS grants write access.
 */
export async function getPublicStore(): Promise<DataStore> {
  if (!hasSupabaseConfig) {
    if (!demoStore) demoStore = createDemoStore();
    return demoStore;
  }

  const { getPublicSupabaseStore } = await import("@/lib/data/supabase-store");
  const { createCachedPublicStore } = await import("@/lib/data/cached-public-store");
  return createCachedPublicStore(getPublicSupabaseStore());
}
