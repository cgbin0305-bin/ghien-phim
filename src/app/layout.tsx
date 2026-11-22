import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { getPublicStore } from "@/lib/data";
import { ToastProvider } from "@/components/ui/toast";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { isDemoMode } from "@/lib/env";

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
  themeColor: "#0D1321",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStore();
  const settings = await store.getSettings();

  const title = settings.seoTitle ?? settings.siteName;
  const description =
    settings.seoDescription ??
    settings.siteDescription ??
    "Xem phim cổ trang, tiên hiệm, kiếm hiệp và cung đấu Trung Hoại kèm phụ đề tiếng Việt.";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: `%s | ${settings.siteName}`,
    },
    description,
    applicationName: settings.siteName,
    keywords: ["phim cổ trang", "tiên hiệp", "kiếm hiệp", "cung đấu", "phim Trung Hoại", "vietsub"],
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
          <main id="main" className="min-h-[60vh] w-full max-w-full overflow-x-clip">
            {children}
          </main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
