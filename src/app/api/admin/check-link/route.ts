import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Proxy kiểm tra YouTube oEmbed phía server cho công cụ Auto Link Health Check.
 *
 * Lý do cần proxy qua `/api/admin/check-link`:
 * - `next.config.ts` thiết lập Content-Security-Policy (`connect-src 'self' https://*.supabase.co`)
 *   nên trình duyệt sẽ chặn `fetch` trực tiếp tới `https://www.youtube.com/oembed`.
 * - Gọi từ phía server vừa tuân thủ CSP vừa tránh lỗi CORS / AdBlock trên trình duyệt.
 */
export async function GET(request: NextRequest) {
  if (!isDemoMode) {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const oembedParam = request.nextUrl.searchParams.get("oembed");
  if (!oembedParam) {
    return NextResponse.json({ error: "Missing oembed parameter" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(oembedParam);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Chỉ cho phép gọi đúng endpoint YouTube oEmbed để chống SSRF
  if (
    targetUrl.protocol !== "https:" ||
    targetUrl.hostname !== "www.youtube.com" ||
    targetUrl.pathname !== "/oembed"
  ) {
    return NextResponse.json({ error: "Forbidden target" }, { status: 403 });
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "GhienPhim-LinkChecker/1.0",
      },
    });

    return NextResponse.json(
      { ok: upstream.ok, status: upstream.status },
      { status: upstream.status },
    );
  } catch {
    return NextResponse.json({ ok: false, status: 502 }, { status: 502 });
  }
}
