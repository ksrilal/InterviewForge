import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshing the session here (rather than only in Server Components) is
  // required by @supabase/ssr - it's what keeps the auth cookie valid across
  // requests instead of expiring silently.
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Forward the already-verified user id so the (app) layout doesn't have to
  // make its own redundant auth.getUser() round-trip just to read it again -
  // that second round-trip was adding visible latency before any UI painted.
  // Must be set on the *request* headers (via the NextResponse.next options),
  // not response.headers - the latter only reaches the browser, not the
  // Server Component render that needs to read it back via headers().
  request.headers.set("x-user-id", data.user.id);
  response = NextResponse.next({ request });
  return response;
}

export const config = {
  // Guards everything except the login page, the OAuth callback, static
  // assets, and Next.js internals.
  matcher: ["/((?!login|auth/callback|_next/static|_next/image|favicon.ico).*)"],
};
