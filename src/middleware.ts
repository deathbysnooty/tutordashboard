import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session;

  const isPublicPath =
    nextUrl.pathname === "/" || nextUrl.pathname === "/access-denied";
  const isPendingPath = nextUrl.pathname === "/pending";
  const isAdminPath = nextUrl.pathname.startsWith("/admin");

  // Unauthenticated users can only access public paths
  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isLoggedIn) {
    const status = session.user.status;
    const role = session.user.role;

    // Pending users can only see the pending screen
    if (status === "pending" && !isPendingPath) {
      return NextResponse.redirect(new URL("/pending", nextUrl));
    }

    // Active users don't need the pending screen
    if (status === "active" && isPendingPath) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    // Active users shouldn't see the login page
    if (status === "active" && nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    // Only admins can access /admin routes
    if (isAdminPath && role !== "admin") {
      return NextResponse.redirect(new URL("/access-denied", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
