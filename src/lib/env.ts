/**
 * Runtime configuration detection.
 *
 * The app has two data backends:
 *  - `supabase`: production mode, real Postgres + Auth + Storage.
 *  - `demo`: in-memory seed data used when no credentials are configured.
 *
 * Demo mode is always explicit in the UI (a banner + `data-mode` attribute), and
 * demo data is never written back to production tables.
 */

export const SITE_TIMEZONE = "Asia/Ho_Chi_Minh";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const hasServiceRoleKey = Boolean(serviceRoleKey);

export const siteConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  serviceRoleKey,
};

export type DataMode = "supabase" | "demo";

export function getDataMode(): DataMode {
  return hasSupabaseConfig ? "supabase" : "demo";
}

export const isDemoMode = !hasSupabaseConfig;

/**
 * Lấy URL gốc chuẩn của website một cách an toàn tuyệt đối.
 * - Tự động bổ sung `https://` nếu người dùng chỉ nhập domain (ví dụ: `ghien-phim.vercel.app`).
 * - Tự động nhận diện domain Vercel cấp nếu người dùng chưa cài đặt `NEXT_PUBLIC_SITE_URL`.
 * - Luôn trả về URL hợp lệ, không bao giờ văng ngoại lệ Invalid URL làm sập build.
 */
export function getSiteUrl(): string {
  const customUrl = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (customUrl) {
    try {
      const normalized = customUrl.startsWith("http://") || customUrl.startsWith("https://")
        ? customUrl
        : `https://${customUrl}`;
      return new URL(normalized).origin;
    } catch {
      // Bỏ qua nếu giá trị chuỗi không phân tích được
    }
  }

  const vercelUrl =
    clean(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    clean(process.env.NEXT_PUBLIC_VERCEL_URL) ||
    clean(process.env.VERCEL_URL);

  if (vercelUrl) {
    try {
      const normalized = vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://")
        ? vercelUrl
        : `https://${vercelUrl}`;
      return new URL(normalized).origin;
    } catch {
      // Bỏ qua
    }
  }

  return "http://localhost:3000";
}

/**
 * Lấy đối tượng URL gốc cho metadataBase.
 */
export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl());
}
