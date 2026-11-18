import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: {
    default: "Quản trị",
    template: "%s | Quản trị Ghiền Phim",
  },
  robots: { index: false, follow: false },
};

/**
 * Guarded admin shell.
 *
 * The session + role check happens on the server for every request. The
 * `/admin/login` route lives outside this group so it stays reachable.
 *
 * Two distinct situations are handled explicitly:
 *  - Supabase IS configured but the visitor has no admin session -> redirect
 *    to the login page. The admin area is never served to an anonymous user.
 *  - Supabase is NOT configured (demo mode) -> the panel is still reachable so
 *    the interface can be reviewed, but every write action refuses to pretend
 *    it saved anything, and a banner states the situation.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = isDemoMode ? null : await getAdminSession();

  if (!isDemoMode && !session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell userEmail={session?.email ?? null} canSignOut={!isDemoMode && Boolean(session)}>
      {children}
    </AdminShell>
  );
}
