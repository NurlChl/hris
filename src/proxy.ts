import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isOnAdmin = nextUrl.pathname.startsWith("/admin");
  const isOnPortal = nextUrl.pathname.startsWith("/portal");
  const isOnLogin = nextUrl.pathname.startsWith("/auth/login");
  const isOnAdminLogin = nextUrl.pathname.startsWith("/auth/admin");

  if (isOnAdmin) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/auth/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return Response.redirect(loginUrl);
    }

    const userRole = req.auth?.user?.role;
    if (userRole === "STAFF") {
      // Staff cannot access admin area, redirect to employee portal
      return Response.redirect(new URL("/portal/attendance", nextUrl));
    }
  }

  if (isOnPortal) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/auth/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return Response.redirect(loginUrl);
    }
  }

  // Redirect logged-in users away from login pages to their respective dashboards
  if (isLoggedIn && (isOnLogin || isOnAdminLogin)) {
    const userRole = req.auth?.user?.role;
    if (userRole === "STAFF") {
      return Response.redirect(new URL("/portal/attendance", nextUrl));
    } else {
      return Response.redirect(new URL("/admin", nextUrl));
    }
  }

  return undefined; // Let Next.js handle it
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/auth/login",
    "/auth/admin"
  ]
};
