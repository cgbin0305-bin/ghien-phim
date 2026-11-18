import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase session cookie so that Server Components and Server
 * Actions always see a valid session.
 *
 * The admin area is additionally protected inside the layout and in every
 * Server Action - this middleware only maintains the session.
 *
 * PERFORMANCE: `supabase.auth.getUser()` makes a network round-trip to the Auth
 * server (~65-320ms measured from Vietnam). Running it on *every* request meant
 * anonymous visitors - the vast majority of traffic - paid that cost on every
 * page view, for a session they do not have.
 *
 * The session lives in a cookie whose name starts with `sb-` and ends with
 * `-auth-token`. When that cookie is absent there is nothing to refresh, so we
 * return immediately. Only requests that actually carry a session pay the
 * round-trip.
 */

/** Supabase stores the session in `sb-<project-ref>-auth-token` (possibly chunked). */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Demo mode, or a visitor with no session: nothing to refresh.
  if (!url || !anonKey || !hasSessionCookie(request)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // `getUser()` revalidates the JWT against the Auth server.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/poster|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
