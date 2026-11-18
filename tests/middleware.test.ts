import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Hồi quy cho lỗi hiệu năng middleware.
 *
 * `middleware.ts` từng gọi `supabase.auth.getUser()` trên **mọi** request.
 * Đó là một vòng tròn mạng tới Supabase Auth (đo được 65-320ms từ Việt Nam),
 * trả giá cho cả khách vãng lai — nhóm chiếm phần lớn lưu lượng và hoàn toàn
 * không có phiên để làm mới.
 *
 * Middleware giờ chỉ gọi Auth khi request thực sự mang cookie phiên
 * (`sb-*-auth-token`). Test này chốt lại hành vi đó.
 */

const getUser = vi.fn(async () => ({ data: { user: null }, error: null }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

/** Tạo `NextRequest` giả với danh sách cookie cho trước. */
function makeRequest(cookieNames: string[]) {
  return {
    cookies: {
      getAll: () => cookieNames.map((name) => ({ name, value: "x" })),
      set: () => undefined,
    },
  } as unknown as Parameters<typeof import("@/middleware").middleware>[0];
}

describe("middleware — không gọi Supabase Auth khi không cần", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    // `NextResponse.next` cần runtime của Next; thay bằng stub tối giản.
    vi.doMock("next/server", () => ({
      NextResponse: {
        next: () => ({ cookies: { set: () => undefined } }),
      },
    }));
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    vi.resetModules();
    vi.doUnmock("next/server");
  });

  it("khách vãng lai (không có cookie phiên) không tốn vòng tròn Auth", async () => {
    const { middleware } = await import("@/middleware");
    await middleware(makeRequest([]));
    expect(getUser).not.toHaveBeenCalled();
  });

  it("request có cookie phiên vẫn được làm mới", async () => {
    const { middleware } = await import("@/middleware");
    await middleware(makeRequest(["sb-kzbfxarmuwmcuxvlhlvx-auth-token"]));
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("bỏ qua cookie không liên quan tới phiên", async () => {
    const { middleware } = await import("@/middleware");
    await middleware(makeRequest(["theme", "NEXT_LOCALE"]));
    expect(getUser).not.toHaveBeenCalled();
  });
});
