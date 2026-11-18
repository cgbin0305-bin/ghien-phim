import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { getPublicStore } from "@/lib/data";
import { ToastProvider } from "@/components/ui/toast";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { isDemoMode, getSiteUrlObject } from "@/lib/env";
import type { SiteSettings } from "@/lib/types";

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Ghiền Phim",
  siteDescription: "Xem phim cổ trang, tiên hiệp, kiếm hiệp và cung đấu Trung Quốc kèm phụ đề tiếng Việt.",
  logoUrl: null,
  contactEmail: null,
  contactNote: null,
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
  featuredMovieId: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const serif = Cormorant_Garamond({
  subsets: ["vietnamese", "latin"],
  weight: ["600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B0C10",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  let settings: SiteSettings = DEFAULT_SETTINGS;
  try {
    const store = await getPublicStore();
    const fetched = await store.getSettings();
    if (fetched) {
      settings = fetched;
    }
  } catch (err) {
    console.warn("[layout] Không thể tải cấu hình site, sử dụng mặc định:", err);
  }

  const title = settings.seoTitle ?? settings.siteName;
  const description =
    settings.seoDescription ??
    settings.siteDescription ??
    DEFAULT_SETTINGS.siteDescription ??
    "Xem phim cổ trang, tiên hiệp, kiếm hiệp và cung đấu Trung Quốc kèm phụ đề tiếng Việt.";

  return {
    metadataBase: getSiteUrlObject(),
    title: {
      default: title,
      template: `%s | ${settings.siteName}`,
    },
    description,
    applicationName: settings.siteName,
    keywords: ["phim cổ trang", "tiên hiệp", "kiếm hiệp", "cung đấu", "phim Trung Quốc", "vietsub"],
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: settings.siteName,
      title,
      description,
      images: settings.ogImageUrl ? [{ url: settings.ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: isDemoMode ? { index: false, follow: false } : { index: true, follow: true },
    alternates: { canonical: "/" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseOrigin: string | null = null;
  if (supabaseUrl) {
    try {
      supabaseOrigin = new URL(supabaseUrl).origin;
    } catch {
      supabaseOrigin = null;
    }
  }

  return (
    <html lang="vi" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />}
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://www.facebook.com" />
      </head>
      <body className="bg-ink-texture min-h-dvh">
        <ToastProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-950"
          >
            Bỏ qua tới nội dung chính
          </a>
          <DemoBanner />
          <SiteHeader />
          <main id="main" className="min-h-[60vh]">
            {children}
          </main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
