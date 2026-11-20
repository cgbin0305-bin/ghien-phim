import "server-only";
import type { DataStore } from "@/lib/data/types";

/**
 * Cache bộ nhớ TTL ngắn hạn dành riêng cho khu vực Quản trị (Admin).
 *
 * Mục tiêu:
 * - Khi Admin chuyển tab qua lại (/admin -> /admin/phim -> /admin/cai-dat -> /admin/phan-tich),
 *   các dữ liệu đã đọc gần đây (trong vòng 60s) được trả ngay từ RAM (~0ms) thay vì
 *   bắn lại hàng loạt truy vấn PostgREST sang Supabase.
 * - Khi bất kỳ thao tác ghi nào (tạo, sửa, xoá, sắp xếp, lưu cài đặt) xảy ra,
 *   toàn bộ `adminCacheClear()` được xoá lập tức nên dữ liệu Admin luôn chính xác 100%.
 */

interface AdminCacheEntry {
  value: unknown;
  expiresAt: number;
}

const ADMIN_CACHE_TTL_SECONDS = 60;

const globalAdminCache = globalThis as typeof globalThis & {
  __gheienPhimAdminCache?: Map<string, AdminCacheEntry>;
  __gheienPhimAdminInFlight?: Map<string, Promise<unknown>>;
};

const adminStore: Map<string, AdminCacheEntry> =
  (globalAdminCache.__gheienPhimAdminCache ??= new Map());

const adminInFlight: Map<string, Promise<unknown>> =
  (globalAdminCache.__gheienPhimAdminInFlight ??= new Map());

export function adminCacheClear(): void {
  adminStore.clear();
  adminInFlight.clear();
}

function memoizeAdmin<T>(
  namespace: string,
  keyFn: (args: unknown[]) => string,
  fn: (...args: unknown[]) => Promise<T>,
  ttlSeconds = ADMIN_CACHE_TTL_SECONDS,
): (...args: unknown[]) => Promise<T> {
  return async (...args: unknown[]): Promise<T> => {
    const cacheKey = `${namespace}:${keyFn(args)}`;
    const now = Date.now();
    const hit = adminStore.get(cacheKey);
    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }

    const pending = adminInFlight.get(cacheKey);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = fn(...args)
      .then((value) => {
        if (adminStore.size > 500) {
          adminStore.clear();
        }
        adminStore.set(cacheKey, {
          value,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        return value;
      })
      .finally(() => {
        adminInFlight.delete(cacheKey);
      });

    adminInFlight.set(cacheKey, promise);
    return promise;
  };
}

const READ_METHODS: Array<{
  name: keyof DataStore;
  key: (args: unknown[]) => string;
}> = [
  { name: "getSettings", key: () => "settings" },
  { name: "getGenres", key: () => "genres" },
  { name: "getMovieGenres", key: () => "movieGenres" },
  { name: "listAllMoviesForAdmin", key: () => "allMovies" },
  { name: "getMovieById", key: (args) => `movie:${args[0]}` },
  { name: "listEpisodes", key: (args) => `episodes:${args[0]}` },
  { name: "listAllPostsForAdmin", key: () => "allPosts" },
  { name: "getPostById", key: (args) => `post:${args[0]}` },
  { name: "getScheduleForWeek", key: (args) => `week:${args[0]}` },
  { name: "listUpcomingSchedule", key: (args) => `upcoming:${args[0] ?? 10}` },
  { name: "getDashboardStats", key: () => "dashboardStats" },
];

const WRITE_METHODS: Array<keyof DataStore> = [
  "updateSettings",
  "createGenre",
  "updateGenre",
  "deleteGenre",
  "createMovie",
  "updateMovie",
  "deleteMovie",
  "createEpisode",
  "updateEpisode",
  "deleteEpisode",
  "createScheduleEvent",
  "updateScheduleEvent",
  "deleteScheduleEvent",
  "createPost",
  "updatePost",
  "deletePost",
];

export function createCachedAdminStore(store: DataStore): DataStore {
  const proxy = { ...store } as DataStore;

  for (const entry of READ_METHODS) {
    const original = store[entry.name] as unknown as (...args: unknown[]) => Promise<unknown>;
    if (typeof original !== "function") continue;
    (proxy as unknown as Record<string, unknown>)[entry.name] = memoizeAdmin(
      String(entry.name),
      entry.key,
      original.bind(store),
    );
  }

  for (const methodName of WRITE_METHODS) {
    const original = store[methodName] as unknown as (...args: unknown[]) => Promise<unknown>;
    if (typeof original !== "function") continue;
    const boundOriginal = original.bind(store);
    (proxy as unknown as Record<string, unknown>)[methodName] = async (...args: unknown[]) => {
      try {
        return await boundOriginal(...args);
      } finally {
        adminCacheClear();
      }
    };
  }

  return proxy;
}
