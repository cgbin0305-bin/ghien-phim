import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TTL_SECONDS,
  memoize,
  ttlCacheClear,
  ttlCacheGet,
  ttlCacheSet,
} from "@/lib/data/ttl-cache";
import { createCachedPublicStore } from "@/lib/data/cached-public-store";
import type { DataStore } from "@/lib/data/types";

/**
 * Cache TTL trong bộ nhớ.
 *
 * Đây là lớp cache bù cho việc Next.js Data Cache không dùng được với các
 * request có header `Authorization` (mà Supabase luôn gửi). Nếu cache này
 * hỏng, trang công khai sẽ chậm trở lại hoặc hiển thị dữ liệu cũ sau khi
 * quản trị viên sửa nội dung.
 */

beforeEach(() => {
  ttlCacheClear();
});

afterEach(() => {
  vi.useRealTimers();
  ttlCacheClear();
});

describe("ttlCacheGet / ttlCacheSet", () => {
  it("trả về giá trị vừa ghi", () => {
    ttlCacheSet("a", { x: 1 }, 60);
    const result = ttlCacheGet<{ x: number }>("a");
    expect(result.hit).toBe(true);
    if (!result.hit) return;
    expect(result.value).toEqual({ x: 1 });
  });

  it("báo miss với khoá chưa từng ghi", () => {
    expect(ttlCacheGet("khong-co")).toEqual({ hit: false });
  });

  it("tự xoá khi đã hết hạn", () => {
    vi.useFakeTimers();
    ttlCacheSet("het-han", "gia-tri", 10);

    vi.advanceTimersByTime(9_000);
    expect(ttlCacheGet("het-han").hit).toBe(true);

    vi.advanceTimersByTime(2_000);
    expect(ttlCacheGet("het-han")).toEqual({ hit: false });
  });

  it("làm mới hạn khi ghi lại cùng khoá", () => {
    vi.useFakeTimers();
    ttlCacheSet("k", "v1", 10);
    vi.advanceTimersByTime(9_000);
    ttlCacheSet("k", "v2", 10);
    vi.advanceTimersByTime(9_000);

    const result = ttlCacheGet<string>("k");
    expect(result.hit).toBe(true);
    if (!result.hit) return;
    expect(result.value).toBe("v2");
  });

  it("xoá sạch khi gọi ttlCacheClear", () => {
    ttlCacheSet("x", 1, 60);
    ttlCacheSet("y", 2, 60);
    ttlCacheClear();
    expect(ttlCacheGet("x").hit).toBe(false);
    expect(ttlCacheGet("y").hit).toBe(false);
  });
});

describe("memoize", () => {
  it("gọi hàm gốc đúng một lần cho cùng tham số", async () => {
    const spy = vi.fn(async (n: number) => n * 2);

    const fn = memoize("double", ([n]: [number]) => String(n), spy);

    expect(await fn(2)).toBe(4);
    expect(await fn(2)).toBe(4);
    expect(await fn(3)).toBe(6);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("tái gọi hàm gốc khi hết TTL", async () => {
    vi.useFakeTimers();
    const spy = vi.fn(async () => "ket-qua");

    const fn = memoize("fixed", () => "khoa", spy, 10);

    await fn();
    await fn();
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(11_000);
    await fn();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("dùng khoá khác nhau cho tham số khác nhau", async () => {
    const spy = vi.fn(async (n: number) => n);

    const fn = memoize("id", ([n]: [number]) => String(n), spy);

    await fn(1);
    await fn(2);
    await fn(1);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("dùng TTL mặc định là 300 giây", () => {
    expect(DEFAULT_TTL_SECONDS).toBe(300);
  });

  it("không cache lỗi — lần gọi sau phải thử lại", async () => {
    const spy = vi.fn(async () => {
      throw new Error("lỗi mạng");
    });

    const fn = memoize("error", () => "khoa", spy);

    await expect(fn()).rejects.toThrow("lỗi mạng");
    await expect(fn()).rejects.toThrow("lỗi mạng");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("gộp request đồng thời thành một lần gọi (in-flight dedupe)", async () => {
    // Trang chủ đọc cùng một khoá từ nhiều component trong một lượt render.
    // Nếu cache nguội mà không gộp, mỗi component bắn một truy vấn PostgREST
    // giống hệt nhau — đúng thứ làm trang chủ chậm.
    let resolveFn: ((value: string) => void) | undefined;
    const spy = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFn = resolve;
        }),
    );

    const fn = memoize("slow", () => "khoa", spy);

    const a = fn();
    const b = fn();
    const c = fn();

    expect(spy).toHaveBeenCalledTimes(1);

    resolveFn?.("ket-qua");
    expect(await Promise.all([a, b, c])).toEqual(["ket-qua", "ket-qua", "ket-qua"]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("sau khi request đồng thời xong, lần gọi mới dùng cache", async () => {
    const spy = vi.fn(async () => "gia-tri");
    const fn = memoize("seq", () => "khoa", spy);

    await Promise.all([fn(), fn()]);
    await fn();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("createCachedPublicStore", () => {
  function makeStore(overrides: Partial<DataStore> = {}): DataStore {
    const base = {
      mode: "demo",
      getSettings: vi.fn(async () => ({ siteName: "Ghiền Phim" })),
      getGenres: vi.fn(async () => []),
      listMovieYears: vi.fn(async () => [2026]),
      listMovies: vi.fn(async () => ({ movies: [], total: 0, page: 1, perPage: 12, totalPages: 1 })),
      getMovieBySlug: vi.fn(async () => null),
      getMovieById: vi.fn(async () => null),
      getRelatedMovies: vi.fn(async () => []),
      listEpisodes: vi.fn(async () => []),
      getLatestPublishedEpisode: vi.fn(async () => null),
      getScheduleForWeek: vi.fn(async () => ({ weekStart: "2026-01-05", weekEnd: "2026-01-11", events: [] })),
      listUpcomingSchedule: vi.fn(async () => []),
      listPosts: vi.fn(async () => []),
      getPostBySlug: vi.fn(async () => null),
    } as unknown as DataStore;

    return { ...base, ...overrides } as DataStore;
  }

  it("gọi store gốc chỉ một lần cho cùng tham số", async () => {
    const spy = vi.fn(async () => ({ movies: [], total: 0, page: 1, perPage: 12, totalPages: 1 }));
    const cached = createCachedPublicStore(makeStore({ listMovies: spy } as never));

    await cached.listMovies({ perPage: 12 });
    await cached.listMovies({ perPage: 12 });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("tách khoá theo bộ lọc khác nhau", async () => {
    const spy = vi.fn(async () => ({ movies: [], total: 0, page: 1, perPage: 12, totalPages: 1 }));
    const cached = createCachedPublicStore(makeStore({ listMovies: spy } as never));

    await cached.listMovies({ genre: "co-trang" });
    await cached.listMovies({ genre: "kiem-hiep" });
    await cached.listMovies({ genre: "co-trang" });

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("không cache các hàm ghi dữ liệu", async () => {
    const spy = vi.fn(async () => null);
    const cached = createCachedPublicStore(
      makeStore({ createMovie: spy } as never),
    );

    await (cached as unknown as { createMovie: () => Promise<null> }).createMovie();
    await (cached as unknown as { createMovie: () => Promise<null> }).createMovie();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("giữ nguyên `mode` của store gốc", () => {
    const cached = createCachedPublicStore(makeStore());
    expect(cached.mode).toBe("demo");
  });
});
