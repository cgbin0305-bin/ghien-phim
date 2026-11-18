import "server-only";

/**
 * Cache bộ nhớ theo TTL cho dữ liệu công khai.
 *
 * Next.js Data Cache không dùng được cho các route động vì Supabase gửi kèm
 * header `Authorization` (Next.js coi đó là "uncacheable header"). Vì vậy ta
 * thêm một lớp cache ở tầng data layer: các lần đọc cùng tham số trong vòng
 * `ttl` giây sẽ được trả lại từ bộ nhớ thay vì gọi PostgREST.
 *
 * Hai cơ chế quan trọng:
 *
 *  1. **Gộp request đồng thời (in-flight dedupe).** Khi cache nguội mà nhiều
 *     component cùng đọc một khoá trong một lượt render, chỉ request đầu tiên
 *     gọi PostgREST; các request sau chờ chung promise đó. Nếu không, một
 *     trang như trang chủ (6 lần `listMovies`) sẽ bắn trùng truy vấn.
 *
 *  2. **TTL theo tầng dữ liệu.** Nội dung ít đổi (thể loại, cài đặt, danh
 *     sách năm) được giữ lâu hơn nội dung đổi thường xuyên (lịch chiếu, bài
 *     viết), thay vì mọi thứ dùng chung một mức 300 giây.
 *
 * Cache nằm trong bộ nhớ của tiến trình server, nên:
 *  - không cần serialize (có thể cache cả `Map`),
 *  - tự động đồng bộ giữa các request trong cùng instance.
 *
 * Cache được xoá ngay khi quản trị viên sửa nội dung (xem `src/lib/cache.ts`).
 */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * Lưu trên `globalThis` để mọi bundle trong cùng tiến trình server dùng
 * chung một cache. Nếu lưu ở phạm vi module, các bundle RSC và bundle
 * Server Action có thể nằm ở hai module instance khác nhau và việc xoá cache
 * khi quản trị viên sửa nội dung sẽ không có tác dụng.
 */
const globalStore = globalThis as typeof globalThis & {
  __gheienPhimTtlCache?: Map<string, CacheEntry>;
  __gheienPhimInFlight?: Map<string, Promise<unknown>>;
};

const store: Map<string, CacheEntry> = (globalStore.__gheienPhimTtlCache ??= new Map());

/**
 * Các promise đang chạy, dùng để gộp request đồng thời.
 *
 * Cũng đặt trên `globalThis` vì cùng lý do với `store`.
 */
const inFlight: Map<string, Promise<unknown>> = (globalStore.__gheienPhimInFlight ??=
  new Map());

/** TTL mặc định, khớp với `export const revalidate = 300` của các trang. */
export const DEFAULT_TTL_SECONDS = 300;

/**
 * TTL gợi ý theo loại dữ liệu.
 *
 * Lịch chiếu và bài viết thay đổi thường xuyên theo tuần nên cần tươi hơn;
 * thể loại và cài đặt gần như cố định nên giữ lâu để đỡ gọi PostgREST.
 */
export const TTL = {
  /** Thể loại, cài đặt site — gần như không đổi. */
  static: 1800,
  /** Danh sách phim, chi tiết phim. */
  catalog: 300,
  /** Lịch chiếu — thay đổi theo tuần. */
  schedule: 120,
  /** Bài viết. */
  posts: 180,
} as const;

export function ttlCacheGet<T>(key: string): { hit: true; value: T } | { hit: false } {
  const entry = store.get(key);
  if (!entry) return { hit: false };

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return { hit: false };
  }

  return { hit: true, value: entry.value as T };
}

export function ttlCacheSet(key: string, value: unknown, ttlSeconds: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Xoá toàn bộ cache (dùng khi quản trị viên thay đổi nội dung). */
export function ttlCacheClear(): void {
  store.clear();
  inFlight.clear();
}

/**
 * Bọc một hàm bất đồng bộ bằng cache TTL.
 *
 * `keyFn` phải trả về một chuỗi ổn định cho cùng bộ tham số.
 */
export function memoize<Args extends unknown[], Result>(
  name: string,
  keyFn: (args: Args) => string,
  fn: (...args: Args) => Promise<Result>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): (...args: Args) => Promise<Result> {
  return async (...args: Args) => {
    const key = `${name}:${keyFn(args)}`;
    const cached = ttlCacheGet<Result>(key);
    if (cached.hit) return cached.value;

    // Gộp request đồng thời: nếu một lượt render khác đang gọi đúng khoá này,
    // chờ chung promise thay vì bắn thêm một truy vấn PostgREST.
    const pending = inFlight.get(key);
    if (pending) return pending as Promise<Result>;

    const promise = (async () => {
      try {
        const value = await fn(...args);
        ttlCacheSet(key, value, ttlSeconds);
        return value;
      } finally {
        // Luôn xoá khỏi danh sách đang chạy, kể cả khi lỗi, để lần sau còn thử lại.
        inFlight.delete(key);
      }
    })();

    inFlight.set(key, promise);
    return promise;
  };
}
