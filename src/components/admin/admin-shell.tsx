"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  FileText,
  Film,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/admin/login/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Bảng điều khiển", icon: LayoutDashboard, exact: true },
  { href: "/admin/phan-tich", label: "Phân tích & Link", icon: BarChart3, exact: false },
  { href: "/admin/phim", label: "Phim", icon: Film, exact: false },
  { href: "/admin/the-loai", label: "Thể loại", icon: Tags, exact: false },
  { href: "/admin/lich-chieu", label: "Lịch chiếu", icon: CalendarRange, exact: false },
  { href: "/admin/bai-viet", label: "Bài viết", icon: FileText, exact: false },
  { href: "/admin/cai-dat", label: "Cài đặt", icon: Settings, exact: false },
];

export function AdminShell({
  children,
  userEmail,
  canSignOut,
}: {
  children: React.ReactNode;
  userEmail: string | null;
  canSignOut: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <>{children}</>;
  }

  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-ink-texture">
      <div className="mx-auto flex max-w-[1500px]">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 border-r border-ink-700/70 px-3 py-6 lg:block">
          <nav aria-label="Điều hướng quản trị" className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive(item)
                    ? "bg-gold-500/12 text-gold-200"
                    : "text-parchment-300/75 hover:bg-ink-850 hover:text-parchment-100",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 border-t border-ink-700/70 pt-4">
            {canSignOut ? (
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-parchment-300/75 transition-colors hover:bg-ink-850 hover:text-parchment-100"
                >
                  <LogOut className="size-4 shrink-0" aria-hidden="true" />
                  Đăng xuất
                </button>
              </form>
            ) : (
              <p className="px-3 text-xs leading-relaxed text-mist-500">
                {userEmail ? `Đang đăng nhập: ${userEmail}` : "Chế độ demo"}
              </p>
            )}
          </div>
        </aside>

        {/* Mobile bar */}
        <div className="min-w-0 flex-1">
          <div className="sticky top-16 z-40 flex items-center justify-between gap-3 border-b border-ink-700/70 bg-ink-950/90 px-4 py-2.5 backdrop-blur lg:hidden">
            <nav aria-label="Điều hướng quản trị" className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item) ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded px-2.5 py-1.5 text-xs transition-colors",
                    isActive(item)
                      ? "bg-gold-500/12 text-gold-200"
                      : "text-parchment-300/75 hover:text-parchment-100",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="shrink-0 rounded-md border border-ink-700 p-1.5 text-parchment-300"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            >
              {mobileOpen ? <Menu className="size-4" /> : <X className="size-4" />}
            </button>
          </div>

          {mobileOpen && (
            <div className="border-b border-ink-700/70 bg-ink-900 px-4 py-3 lg:hidden">
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-parchment-300/80 hover:bg-ink-850"
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}