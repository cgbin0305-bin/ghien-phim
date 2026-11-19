import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { siteConfig } from "@/lib/env";

/** Thời gian cache cho dữ liệu công khai (giây). */
const PUBLIC_REVALIDATE = 30;

/**
 * Tag dùng để xoá cache khi quản trị viên sửa nội dung.
 * Mỗi bảng có một tag riêng để việc xoá cache chính xác, không xoá toàn bộ.
 */
export const CACHE_TAGS = {
  movies: "movies",
  episodes: "episodes",
  posts: "posts",
  schedule: "schedule",
  settings: "settings",
  genres: "genres",
} as const;

const ALL_CACHE_TAGS = Object.values(CACHE_TAGS);

/** `next` là tuỳ chọn riêng của Next.js, không nằm trong RequestInit chuẩn. */
type NextFetchInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

/**
 * Public (anonymous) Supabase client.
 *
 * This client never touches `cookies()`, so a page that only reads published
 * content stays cacheable by Next.js (`revalidate` / ISR). Using the request
 * scoped client (`src/lib/supabase/server.ts`) would opt every page into
 * dynamic rendering because reading cookies marks the route as dynamic.
 *
 * RLS still applies: the anon role can only SELECT published rows.
 */
export function createPublicClient() {
  if (!siteConfig.url || !siteConfig.anonKey) {
    throw new Error("Supabase chưa được cấu hình.");
  }

  /**
   * Bọc `fetch` để gắn `next.revalidate` + `next.tags`.
   *
   * Next.js 15 không còn cache `fetch` mặc định, nhưng nếu chỉ định
   * `next.revalidate` thì request được lưu vào Data Cache và dùng lại trong
   * `revalidate` giây. Đây là thay đổi lớn nhất về tốc độ: một vòng tròn
   * PostgREST mất ~90-200ms từ Việt Nam tới region Supabase, và sau khi cache
   * thì độ trễ gần như bằng 0.
   */
  const cachedFetch = ((input: RequestInfo | URL, init?: NextFetchInit) => {
    const headers = new Headers(init?.headers);
    headers.set("accept-encoding", "gzip");

    return fetch(input, {
      ...init,
      headers,
      next: {
        revalidate: PUBLIC_REVALIDATE,
        tags: ALL_CACHE_TAGS,
      },
    });
  }) as typeof fetch;

  return createSupabaseClient<Database>(siteConfig.url, siteConfig.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: cachedFetch },
  });
}
