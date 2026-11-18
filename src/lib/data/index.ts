import "server-only";
import type { DataStore } from "@/lib/data/types";
import { createDemoStore } from "@/lib/data/demo-store";
import { hasSupabaseConfig } from "@/lib/env";

/**
 * Demo stores are cached per server process. The Supabase store is created per
 * request so that it always carries the caller's cookies (and therefore their
 * RLS context).
 */
let demoStore: DataStore | null = null;

/**
 * Store công khai có cache TTL trong bộ nhớ.
 *
 * Dùng cho các trang chỉ đọc nội dung đã xuất bản. Cache giúp độ trễ ổn định
 * kể cả khi Next.js Data Cache không áp dụng (các route động).
 *
 * Lưu trên `globalThis` để mọi bundle trong cùng tiến trình server dùng chung
 * một instance - nếu không, việc xoá cache khi quản trị viên sửa nội dung sẽ
 * không có tác dụng với các bundle khác.
 */
const globalStore = globalThis as typeof globalThis & {
  __gheienPhimPublicStore?: DataStore;
};

export async function getStore(): Promise<DataStore> {
  if (!hasSupabaseConfig) {
    if (!demoStore) demoStore = createDemoStore();
    return demoStore;
  }
  const { getSupabaseStore } = await import("@/lib/data/supabase-store");
  return getSupabaseStore();
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

  if (!globalStore.__gheienPhimPublicStore) {
    const { getPublicSupabaseStore } = await import("@/lib/data/supabase-store");
    const { createCachedPublicStore } = await import("@/lib/data/cached-public-store");
    globalStore.__gheienPhimPublicStore = createCachedPublicStore(getPublicSupabaseStore());
  }

  return globalStore.__gheienPhimPublicStore;
}
