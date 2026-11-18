import Link from "next/link";
import { Mail } from "lucide-react";
import { getPublicStore } from "@/lib/data";
import { SITE_TIMEZONE } from "@/lib/env";
import { BrandLogo } from "@/components/layout/brand-logo";

export async function SiteFooter() {
  const store = await getPublicStore();
  const settings = await store.getSettings();

  return (
    <footer className="mt-16 border-t border-ink-700/70 bg-ink-950/60">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 md:gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <BrandLogo
              logoUrl={settings.logoUrl}
              siteName={settings.siteName}
              className="size-8"
            />
            <span className="font-serif text-base font-semibold text-parchment-100">
              {settings.siteName}
            </span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-parchment-300/85">
            {settings.siteDescription ??
              "Nơi tập hợp phim cổ trang, tiên hiệm, kiếm hiệp và cung đấu Trung Hoại kèm phụ đề tiếng Việt."}
          </p>
        </div>

        <nav aria-label="Liên kết chân trang" className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-gold-300/80">
            Khám phá
          </h2>
          <ul className="space-y-2 text-sm">
            {[
              { href: "/phim", label: "Danh sách phim" },
              { href: "/lich-chieu", label: "Lịch chiếu trong tuần" },
              { href: "/bai-viet", label: "Bài viết" },
              { href: "/phim?releaseStatus=airing", label: "Phim đang chiếu" },
              { href: "/phim?releaseStatus=upcoming", label: "Phim sắp chiếu" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="link-underline text-parchment-300/75 transition-colors hover:text-parchment-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-gold-300/80">
            Liên hệ
          </h2>
          {settings.contactEmail ? (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="inline-flex items-center gap-2 text-sm text-parchment-300/75 transition-colors hover:text-parchment-100"
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              {settings.contactEmail}
            </a>
          ) : (
            <p className="text-sm leading-relaxed text-parchment-300/80">
              Chưa thiết lập email liên hệ.
            </p>
          )}
          {settings.contactNote && (
            <p className="text-sm leading-relaxed text-parchment-300/80">{settings.contactNote}</p>
          )}
        </div>
      </div>

      <div className="border-t border-ink-700/60">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6 text-xs text-mist-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.siteName}. Mọi quyền thuộc về chủ sở hữu nội dung.
          </p>
          <p className="max-w-2xl leading-relaxed">
            Website không tải về, không proxy và không scrape video. Video được phát qua cơ chế nhúng
            chính thức của YouTube và Facebook, chỉ với nội dung mà chủ website có quyền sử dụng. Múi
            giờ hiển thị: {SITE_TIMEZONE}.
          </p>
        </div>
      </div>
    </footer>
  );
}
