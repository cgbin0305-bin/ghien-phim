import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { getPublicStore } from "@/lib/data";
import { BrandLogo } from "@/components/layout/brand-logo";
import { HeaderNav } from "@/components/layout/header-nav";

interface SiteHeaderProps {
  /** Highlights the active nav entry. */
  active?: "phim" | "lich-chieu" | "bai-viet" | null;
}

export async function SiteHeader({ active = null }: SiteHeaderProps) {
  const store = await getPublicStore();
  const settings = await store.getSettings();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-700/75 bg-ink-950/85 backdrop-blur-xl transition-colors duration-300 data-[scrolled=true]:border-gold-500/30 data-[scrolled=true]:bg-ink-950/95">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label={`${settings.siteName} — trang chủ`}
        >
          <BrandLogo
            logoUrl={settings.logoUrl}
            siteName={settings.siteName}
            className="size-9"
          />
          <div className="hidden flex-col sm:flex">
            <span className="font-serif text-lg font-semibold leading-none tracking-wide text-parchment-100 transition-colors group-hover:text-gold-200">
              {settings.siteName}
            </span>
            <span className="mt-0.5 text-xs tracking-[0.16em] text-gold-300/75">
              CỔ TRANG CÁC
            </span>
          </div>
        </Link>

        <div className="hidden h-5 w-px bg-ink-700/80 sm:block" aria-hidden="true" />

        <HeaderNav forcedActive={active} />

        <form action="/phim" className="ml-auto min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="site-search" className="sr-only">
            Tìm kiếm phim
          </label>
          <div className="group relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist-400 transition-colors group-focus-within:text-gold-300"
              aria-hidden="true"
            />
            <input
              id="site-search"
              type="search"
              name="q"
              placeholder="Tìm phim cổ trang, tiên hiệp…"
              className="h-9 w-full rounded-full border border-ink-700 bg-ink-900/75 pl-9 pr-9 text-sm text-parchment-100 placeholder:text-mist-500 transition-all duration-200 focus:border-gold-400/60 focus:bg-ink-900 focus:outline-none focus:ring-2 focus:ring-gold-500/25"
            />
            <Sparkles
              className="pointer-events-none absolute right-3 top-1/2 hidden size-3.5 -translate-y-1/2 text-gold-300/70 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 sm:block"
              aria-hidden="true"
            />
          </div>
        </form>
      </div>
      <div className="gold-rule opacity-60" aria-hidden="true" />
    </header>
  );
}
