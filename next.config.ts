import type { NextConfig } from "next";
import { IMAGE_REMOTE_PATTERNS } from "./src/lib/image-hosts";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * The `frame-src` directive lists exactly the two official embed origins we
 * support. A `default-src` of `self` means a compromised or injected iframe
 * pointing anywhere else simply never loads. `script-src` keeps to `'self'`
 * plus the inline styles Next.js injects; `unsafe-inline` is required for the
 * hydration payload and for Next's own bootstrap script.
 *
 * `unsafe-eval` is only needed by the React Fast Refresh runtime in `next dev`;
 * production bundles never evaluate strings, so it is not granted there.
 */
const csp = [
  "default-src 'self'",
  // Next.js injects a small inline bootstrap script and inline style tags.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // The only two places the player is allowed to frame content from.
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://www.facebook.com https://facebook.com",
  "media-src 'self' https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Cho phép upload ảnh poster/backdrop tới 5 MB (mặc định Next.js chỉ 1 MB).
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Nguồn sự thật duy nhất, dùng chung với `src/lib/image-hosts.ts` và
    // component `<SafeImage>`.
    remotePatterns: IMAGE_REMOTE_PATTERNS,
    formats: ["image/avif", "image/webp"],
    // The demo catalogue serves locally generated SVG posters from
    // `/api/poster/[id]`. Next's optimizer refuses SVG by default because a
    // served SVG can carry script. Our generator never emits script or
    // external references, and the CSP below sandboxes the response so an
    // optimized SVG cannot execute anything or load anything remote.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // The demo poster generator encodes its palette and motif into the path
    // segment, so the local pattern only has to match the route shape.
    localPatterns: [{ pathname: "/api/poster/**" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
