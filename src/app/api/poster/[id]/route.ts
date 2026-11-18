import { NextResponse } from "next/server";

/**
 * Generates an original ink-wash style poster placeholder.
 *
 * These are drawn locally (no external image service, no third-party asset),
 * so the demo catalogue ships with artwork we are certain about the rights to.
 *
 * The palette hue and the motif are encoded into the path segment
 * (`/api/poster/<hue>-<motif>-<slug>`) instead of a query string. Next.js
 * matches `images.localPatterns` on an exact search string, so a dynamic
 * query string would break `<Image>` once the rule is enforced.
 */

export const dynamic = "force-dynamic";

const MOTIFS: Record<string, (c: string) => string> = {
  kiem: (c) => `
    <path d="M300 120 L300 520" stroke="${c}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
    <path d="M258 150 L342 150" stroke="${c}" stroke-width="5" opacity="0.7"/>
    <circle cx="300" cy="120" r="13" fill="none" stroke="${c}" stroke-width="5" opacity="0.8"/>
    <path d="M300 520 L272 570 L300 556 L328 570 Z" fill="${c}" opacity="0.7"/>`,
  tien: (c) => `
    <circle cx="300" cy="250" r="92" fill="none" stroke="${c}" stroke-width="5" opacity="0.65"/>
    <circle cx="300" cy="250" r="58" fill="none" stroke="${c}" stroke-width="3" opacity="0.5"/>
    <path d="M300 158 L300 342 M208 250 L392 250" stroke="${c}" stroke-width="3" opacity="0.4"/>
    <circle cx="300" cy="250" r="14" fill="${c}" opacity="0.8"/>`,
  cung: (c) => `
    <rect x="200" y="150" width="200" height="240" fill="none" stroke="${c}" stroke-width="5" opacity="0.65"/>
    <path d="M200 210 L400 210 M200 270 L400 270 M200 330 L400 330" stroke="${c}" stroke-width="3" opacity="0.4"/>
    <path d="M250 150 L250 390 M300 150 L300 390 M350 150 L350 390" stroke="${c}" stroke-width="2.5" opacity="0.28"/>
    <path d="M200 390 L400 390" stroke="${c}" stroke-width="6" opacity="0.55"/>`,
  nguyet: (c) => `
    <circle cx="300" cy="230" r="85" fill="none" stroke="${c}" stroke-width="5" opacity="0.75"/>
    <circle cx="338" cy="206" r="80" fill="#0b1119" opacity="0.92"/>
    <path d="M240 300 Q300 340 360 300" stroke="${c}" stroke-width="3" fill="none" opacity="0.4"/>`,
  mon: (c) => `
    <rect x="195" y="170" width="210" height="230" fill="none" stroke="${c}" stroke-width="5" opacity="0.65"/>
    <path d="M195 285 L405 285" stroke="${c}" stroke-width="4" opacity="0.5"/>
    <circle cx="300" cy="225" r="26" fill="none" stroke="${c}" stroke-width="4" opacity="0.6"/>`,
  vu: (c) => `
    <path d="M300 140 L300 400" stroke="${c}" stroke-width="7" opacity="0.8"/>
    <path d="M240 160 L360 160" stroke="${c}" stroke-width="6" opacity="0.65"/>
    <path d="M262 400 L338 400 L338 440 L262 440 Z" fill="none" stroke="${c}" stroke-width="4" opacity="0.55"/>`,
  van: (c) => `
    <path d="M180 400 Q300 300 420 400" stroke="${c}" stroke-width="5" fill="none" opacity="0.6"/>
    <path d="M160 445 Q300 350 440 445" stroke="${c}" stroke-width="3" fill="none" opacity="0.38"/>
    <path d="M210 330 L300 250 L390 330" stroke="${c}" stroke-width="3" fill="none" opacity="0.32"/>`,
  thien: (c) => `
    <path d="M300 150 L300 470" stroke="${c}" stroke-width="4" opacity="0.55"/>
    <path d="M240 190 L360 190 M230 250 L370 250 M245 310 L355 310" stroke="${c}" stroke-width="3" opacity="0.4"/>
    <circle cx="300" cy="150" r="16" fill="none" stroke="${c}" stroke-width="4" opacity="0.7"/>`,
  ngu: (c) => `
    <path d="M120 470 Q200 330 300 380 Q400 430 480 340" stroke="${c}" stroke-width="4" fill="none" opacity="0.4"/>
    <path d="M120 510 Q220 400 320 445 Q420 490 480 415" stroke="${c}" stroke-width="3" fill="none" opacity="0.28"/>
    <circle cx="380" cy="150" r="46" fill="none" stroke="${c}" stroke-width="4" opacity="0.6"/>`,
};

/** `/api/poster/205-kiem-van-kiem-lam-ngo` -> hue 205, motif "kiem", slug "van-kiem-lam-ngo". */
function parseId(id: string) {
  const parts = id.split("-");
  const huePart = parts.shift() ?? "";
  const motifPart = parts.shift() ?? "";
  const hue = Number.parseInt(huePart, 10);
  const motif = /^[a-z]{1,12}$/.test(motifPart) ? motifPart : "ngu";
  const slug = parts.join("-");
  return {
    hue: Number.isFinite(hue) ? ((hue % 360) + 360) % 360 : 200,
    motif,
    slug: slug.slice(0, 60),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { hue, motif, slug } = parseId(id);

  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "gheien-phim";
  const accent = `hsl(${hue} 42% 62%)`;
  const accentSoft = `hsl(${hue} 38% 74%)`;
  const draw = MOTIFS[motif] ?? MOTIFS.ngu!;

  const title = safeSlug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#101a26"/>
      <stop offset="55%" stop-color="#0b1119"/>
      <stop offset="100%" stop-color="#070b10"/>
    </linearGradient>
    <radialGradient id="moon" cx="50%" cy="50%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="26"/></filter>
  </defs>

  <rect width="1200" height="675" fill="url(#sky)"/>
  <circle cx="880" cy="140" r="220" fill="url(#moon)"/>
  <ellipse cx="600" cy="620" rx="640" ry="150" fill="#0d1620" opacity="0.85" filter="url(#soft)"/>
  <ellipse cx="360" cy="520" rx="420" ry="100" fill="#132030" opacity="0.45" filter="url(#soft)"/>
  <ellipse cx="950" cy="560" rx="380" ry="90" fill="#101c29" opacity="0.45" filter="url(#soft)"/>

  <g transform="translate(120, 0) scale(0.75)" opacity="0.85">${draw(accent)}</g>

  <rect x="0" y="0" width="1200" height="675" fill="none" stroke="${accentSoft}" stroke-opacity="0.22" stroke-width="3"/>
  <rect x="18" y="18" width="1164" height="639" fill="none" stroke="${accentSoft}" stroke-opacity="0.14" stroke-width="1"/>

  <text x="940" y="330" text-anchor="middle" font-family="Georgia, 'Noto Serif', serif" font-size="52" fill="${accentSoft}" fill-opacity="0.92" letter-spacing="1">${title}</text>
  <line x1="700" y1="368" x2="1180" y2="368" stroke="${accent}" stroke-opacity="0.3" stroke-width="1.5"/>
  <text x="940" y="412" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${accent}" fill-opacity="0.5" letter-spacing="9">GHIỀN PHIM</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
