import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = verifySessionToken(token);

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Guards everything except the login page, static assets, and Next.js internals.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
  // Session verification uses Node's `crypto` (createHmac/timingSafeEqual),
  // which the default Edge Runtime doesn't support - run on Node instead.
  runtime: "nodejs",
};
