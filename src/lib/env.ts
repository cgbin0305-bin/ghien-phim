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
