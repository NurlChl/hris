import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.branchId = user.branchId;
        token.divisionId = user.divisionId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.employeeId = token.employeeId as string | null;
        session.user.branchId = token.branchId as string | null;
        session.user.divisionId = token.divisionId as string | null;
      }
      return session;
    },
  },
  providers: [], // Providers are populated in auth.ts
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 day session longevity
  },
} satisfies NextAuthConfig;
