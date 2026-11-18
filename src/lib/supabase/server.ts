import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { siteConfig } from "@/lib/env";

/**
 * Server-side Supabase client bound to the current request cookies.
 *
 * Uses the public anon key together with the signed-in user's session, so
 * Row Level Security still applies to every query. The service role key is
 * reserved for `src/lib/supabase/admin.ts` and is only used where RLS would
 * otherwise block a legitimate administrative operation.
 */
export async function createClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient<Database>(siteConfig.url!, siteConfig.anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
