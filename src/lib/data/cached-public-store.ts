import "server-only";
import type { DataStore, MovieFilters } from "@/lib/data/types";
import { memoize, TTL } from "@/lib/data/ttl-cache";

/**
 * Bọc store công khai bằng cache TTL trong bộ nhớ.
 *
 * Supabase luôn gửi header `Authorization` kèm mọi request, và Next.js coi
 * header đó là "uncacheable" nên Data Cache không hoạt động trong các route
 * động (`/phim`, `/phim/[slug]`, `/lich-chieu`...). Lớp cache này thay thế
 * vai trò đó ở tầng data: mỗi tập tham số chỉ gọi PostgREST một lần trong
 * khoảng `ttlSeconds` giây.
 *
 * TTL được chọn theo nhịp thay đổi thực tế của từng loại dữ liệu: thể loại và
 * cài đặt gần như cố định nên giữ lâu, lịch chiếu đổi theo tuần nên ngắn hơn.
 *
 * CHỈ dùng cho store công khai. Store admin (`getStore`) dùng session của
 * người dùng nên không được cache.
 */

/** Các hàm đọc được cache, kèm cách sinh khoá và TTL riêng. */
const CACHEABLE: Array<{
  name: keyof DataStore;
  key: (args: unknown[]) => string;
  ttl?: number;
}> = [
    { name: "getSettings", key: () => "settings", ttl: TTL.static },
    { name: "getGenres", key: () => "genres", ttl: TTL.static },
    { name: "listMovieYears", key: () => "years", ttl: TTL.static },
    {
      name: "listMovies",
      key: (args) => {
        const f = (args[0] ?? {}) as MovieFilters;
        return JSON.stringify({
          q: f.query ?? null,
          genre: f.genre ?? null,
          year: f.year ?? null,
          releaseStatus: f.releaseStatus ?? null,
          sort: f.sort ?? null,
          page: f.page ?? 1,
          perPage: f.perPage ?? null,
        });
      },
      ttl: TTL.catalog,
    },
    { name: "getMovieBySlug", key: (args) => `slug:${args[0]}`, ttl: TTL.catalog },
    { name: "getMovieById", key: (args) => `id:${args[0]}`, ttl: TTL.catalog },
    {
      name: "getRelatedMovies",
      key: (args) => {
        const movie = args[0] as { id?: string };
        return `related:${movie?.id ?? ""}:${args[1] ?? 8}`;
      },
      ttl: TTL.catalog,
    },
    { name: "listEpisodes", key: (args) => `eps:${args[0]}`, ttl: TTL.catalog },
    {
      name: "getEpisodeBySlug",
      key: (args) => `ep:${args[0]}:${args[1]}`,
      ttl: TTL.catalog,
    },
    {
      name: "getLatestPublishedEpisode",
      key: (args) => `latest:${args[0]}`,
      ttl: TTL.catalog,
    },
    { name: "getScheduleForWeek", key: (args) => `week:${args[0]}`, ttl: TTL.schedule },
    { name: "listUpcomingSchedule", key: (args) => `upcoming:${args[0] ?? 10}`, ttl: TTL.schedule },
    {
      name: "listPosts",
      key: (args) => {
        const o = (args[0] ?? {}) as { type?: string; limit?: number };
        return `posts:${o.type ?? "all"}:${o.limit ?? "all"}`;
      },
      ttl: TTL.posts,
    },
    { name: "getPostBySlug", key: (args) => `post:${args[0]}`, ttl: TTL.posts },
  ];

export function createCachedPublicStore(store: DataStore): DataStore {
  const proxy = { ...store } as DataStore;

  for (const entry of CACHEABLE) {
    const original = store[entry.name] as unknown as (...args: unknown[]) => Promise<unknown>;
    if (typeof original !== "function") continue;

    const cached = memoize(
      String(entry.name),
      entry.key,
      original.bind(store) as (...args: unknown[]) => Promise<unknown>,
      entry.ttl,
    ) as unknown as DataStore[typeof entry.name];

    (proxy as unknown as Record<string, unknown>)[entry.name] = cached;
  }

  return proxy;
}
