import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";

export interface AdminSession {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: "admin" | "viewer";
}

/**
 * Resolves the current admin session.
 *
 * Returns `null` when:
 *  - Supabase is not configured (demo mode), or
 *  - nobody is signed in, or
 *  - the signed-in user has no `admin` role in `public.profiles`.
 *
 * Every admin page and Server Action calls this function; the UI is never the
 * only line of defence.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!hasSupabaseConfig) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) return null;

  const role = (profile as { role: string }).role;
  if (role !== "admin") return null;

  return {
    userId: (profile as { id: string }).id,
    email: (profile as { email: string | null }).email ?? user.email ?? null,
    displayName: (profile as { display_name: string | null }).display_name ?? null,
    role: "admin",
  };
}

/** Throws when there is no admin session. Use at the top of every admin action. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("Bạn không có quyền truy cập khu vực quản trị.");
  }
  return session;
}
