import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

/** Security boundary: /admin is ADMIN-only; /manager is MANAGER-only. */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/admin")) {
    if (!req.auth) {
      const url = new URL("/login", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "ADMIN") {
      const dest = role === "MANAGER" ? "/manager/dashboard" : "/me";
      return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
    }
  }

  if (pathname.startsWith("/manager")) {
    if (!req.auth) {
      const url = new URL("/login", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "MANAGER") {
      const dest = role === "ADMIN" ? "/admin" : "/me";
      return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
    }
  }

  if (pathname.startsWith("/me")) {
    if (!req.auth) {
      const url = new URL("/login", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/me/:path*"],
};
