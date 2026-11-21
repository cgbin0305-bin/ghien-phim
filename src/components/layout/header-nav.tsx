"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, Film, ScrollText } from "lucide-react";
import { TangKinhCacDrawerTrigger } from "@/components/layout/tang-kinh-cac-drawer";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  key: "home" | "phim" | "lich-chieu" | "bai-viet";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Khám phá", key: "home" },
  { href: "/phim", label: "Kho phim", key: "phim" },
  { href: "/lich-chieu", label: "Lịch chiếu", key: "lich-chieu" },
  { href: "/bai-viet", label: "Bài viết", key: "bai-viet" },
];

const NAV_ICONS = {
  home: Compass,
  phim: Film,
  "lich-chieu": CalendarDays,
  "bai-viet": ScrollText,
} as const;

function useActiveNavKey(forcedActive: "phim" | "lich-chieu" | "bai-viet" | null) {
  const pathname = usePathname() ?? "/";

  React.useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const onScroll = () => {
      if (window.scrollY > 16) {
        header.setAttribute("data-scrolled", "true");
      } else {
        header.removeAttribute("data-scrolled");
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (forcedActive) return forcedActive;
  if (pathname === "/") return "home" as const;
  if (pathname.startsWith("/phim") || pathname.startsWith("/xem")) return "phim" as const;
  if (pathname.startsWith("/lich-chieu")) return "lich-chieu" as const;
  if (pathname.startsWith("/bai-viet")) return "bai-viet" as const;
  return null;
}

export function HeaderNav({
  forcedActive = null,
}: {
  forcedActive?: "phim" | "lich-chieu" | "bai-viet" | null;
}) {
  const activeKey = useActiveNavKey(forcedActive);

  return (
    <nav aria-label="Điều hướng chính" className="flex items-center gap-0.5 sm:gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = activeKey === item.key;
        const Icon = NAV_ICONS[item.key];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200 sm:px-3.5",
              isActive
                ? "bg-gold-500/12 text-gold-200 shadow-[inset_0_1px_0_0_rgba(241,220,164,0.18)]"
                : "text-parchment-300/85 hover:bg-ink-850/80 hover:text-parchment-100",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 transition-transform duration-300",
                isActive
                  ? "text-gold-300"
                  : "text-mist-400 group-hover:scale-110 group-hover:text-gold-300",
              )}
              aria-hidden="true"
            />
            <span>{item.label}</span>
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-2.5 -bottom-[13px] h-[2px] rounded-full bg-gradient-to-r from-transparent via-gold-400 to-transparent transition-all duration-300",
                isActive
                  ? "scale-x-100 opacity-100"
                  : "scale-x-0 opacity-0 group-hover:scale-x-75 group-hover:opacity-60",
              )}
            />
          </Link>
        );
      })}
      <div className="ml-1 pl-1">
        <TangKinhCacDrawerTrigger />
      </div>
    </nav>
  );
}

/**
 * Thanh điều hướng 4 cột dành riêng cho điện thoại:
 * luôn nằm gọn 100% trong chiều rộng màn hình, không gây tràn ngang.
 */
export function MobileHeaderNav({
  forcedActive = null,
}: {
  forcedActive?: "phim" | "lich-chieu" | "bai-viet" | null;
}) {
  const activeKey = useActiveNavKey(forcedActive);

  return (
    <nav
      aria-label="Điều hướng di động"
      className="grid grid-cols-4 border-t border-ink-800/80 bg-ink-950/95 px-1.5 py-1 md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeKey === item.key;
        const Icon = NAV_ICONS[item.key];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-gold-500/12 text-gold-200"
                : "text-parchment-300/85 hover:text-parchment-100",
            )}
          >
            <Icon
              className={cn("size-3.5", isActive ? "text-gold-300" : "text-mist-400")}
              aria-hidden="true"
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
