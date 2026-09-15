import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.branchId = user.branchId;
        token.divisionId = user.divisionId;
        token.employeeName = user.employeeName;
        token.mustChangePassword = user.mustChangePassword;
      }
      // Lets the client clear the "must change password" gate right after the
      // user changes it, without forcing a full sign-out/sign-in round trip.
      if (trigger === "update" && session?.mustChangePassword === false) {
        token.mustChangePassword = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.employeeId = (token.employeeId as string | null) ?? null;
        session.user.branchId = (token.branchId as string | null) ?? null;
        session.user.divisionId = (token.divisionId as string | null) ?? null;
        session.user.employeeName = (token.employeeName as string | null) ?? null;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
  providers: [], // Populated in auth.ts — this file stays edge-safe for the proxy.
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12h: long enough for a shift, short enough to limit theft
    updateAge: 60 * 60,
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
} satisfies NextAuthConfig;
