import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** Security boundary: lock /admin to ADMIN sessions and /me to any signed-in user. */
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
      return NextResponse.redirect(new URL("/me", req.nextUrl.origin));
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
  matcher: ["/admin/:path*", "/me/:path*"],
};
