import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight page-level gate: just checks the access-token cookie exists,
 * and redirects to /login if not. This is a UX convenience only — every
 * API route still does its own full JWT verification via requireAuth, so
 * a missing/expired/tampered cookie can never grant real access even if
 * this check were bypassed.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("access_token");
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
