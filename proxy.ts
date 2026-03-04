import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME } from "@/lib/auth/admin";

const protectedPrefixes = ["/clients", "/auctions", "/settings"];
const protectedApiPrefixes = ["/api/import", "/api/oauth/reddit/start", "/api/clients", "/api/auctions"];

function isProtectedPath(pathname: string) {
  return (
    protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}

export function proxy(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_PASSWORD;
  const actual = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!expected || actual !== expected) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/clients/:path*",
    "/auctions/:path*",
    "/settings/:path*",
    "/api/import",
    "/api/oauth/reddit/start",
    "/api/clients/:path*",
    "/api/auctions/:path*",
  ],
};
