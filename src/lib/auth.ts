import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";

export interface AdminSession {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: "admin" | "viewer";
}

const SESSION_TTL_MS = 45_000;

interface CachedSessionEntry {
  session: AdminSession | null;
  expiresAt: number;
}

const globalAuth = globalThis as typeof globalThis & {
  __gheienPhimAdminSessionCache?: Map<string, CachedSessionEntry>;
};

const sessionCache: Map<string, CachedSessionEntry> =
  (globalAuth.__gheienPhimAdminSessionCache ??= new Map());

/** Xoá cache phiên quản trị (dùng khi đăng xuất hoặc đổi tài khoản). */
export function clearAdminSessionCache(): void {
  sessionCache.clear();
}

async function getAuthCookieFingerprint(): Promise<string | null> {
  try {
    const store = await cookies();
    const authCookies = store
      .getAll()
      .filter((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (authCookies.length === 0) return null;
    return authCookies.map((c) => `${c.name}=${c.value}`).join(";");
  } catch {
    return null;
  }
}

/**
 * Resolves the current admin session.
 *
 * Dùng 2 lớp tối ưu để điều hướng trong Admin phản hồi tức thì:
 *  1. `React.cache(...)` gộp mọi lời gọi trùng trong cùng một lượt render RSC.
 *  2. Cache bộ nhớ ngắn hạn (45s) gắn chặt với fingerprint cookie phiên hiện tại,
 *     giúp cắt bỏ 2 vòng gọi mạng `auth.getUser()` + `profiles` (~300–500ms)
 *     mỗi khi Admin chuyển qua lại giữa các tab quản trị.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!hasSupabaseConfig) return null;

  const fingerprint = await getAuthCookieFingerprint();
  if (!fingerprint) return null;

  const now = Date.now();
  const cached = sessionCache.get(fingerprint);
  if (cached && cached.expiresAt > now) {
    return cached.session;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    sessionCache.delete(fingerprint);
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) {
    sessionCache.set(fingerprint, { session: null, expiresAt: now + 10_000 });
    return null;
  }

  const role = (profile as { role: string }).role;
  if (role !== "admin") {
    sessionCache.set(fingerprint, { session: null, expiresAt: now + 10_000 });
    return null;
  }

  const session: AdminSession = {
    userId: (profile as { id: string }).id,
    email: (profile as { email: string | null }).email ?? user.email ?? null,
    displayName: (profile as { display_name: string | null }).display_name ?? null,
    role: "admin",
  };

  // Giới hạn kích thước map tránh phình bộ nhớ
  if (sessionCache.size > 100) {
    sessionCache.clear();
  }
  sessionCache.set(fingerprint, { session, expiresAt: now + SESSION_TTL_MS });

  return session;
});

/** Throws when there is no admin session. Use at the top of every admin action. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("Bạn không có quyền truy cập khu vực quản trị.");
  }
  return session;
}
