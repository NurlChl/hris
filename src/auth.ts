import NextAuth, { CredentialsSignin, DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import Employee from "@/models/Employee";
import { connectToDatabase, isDbUnreachable } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { logActivity } from "@/lib/audit/logger";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      employeeId: string | null;
      branchId?: string | null;
      divisionId?: string | null;
      employeeName?: string | null;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: string;
    employeeId?: string | null;
    branchId?: string | null;
    divisionId?: string | null;
    employeeName?: string | null;
    mustChangePassword?: boolean;
  }
}

/**
 * Every failure path returns the same `null`, and the login page shows one
 * generic message. Distinguishing "unknown email" from "wrong password" would
 * turn the form into an account-enumeration oracle.
 *
 * Nothing here logs the submitted email or password — the previous
 * implementation printed both to the server console on every attempt.
 */
/**
 * Raised when sign-in fails because the database is unreachable, not because
 * the credentials were wrong.
 *
 * Auth.js turns every `authorize()` failure into `CredentialsSignin`, so an
 * outage used to reach the user as "email atau kata sandi salah" — sending
 * people off to reset a password that was never the problem. Subclassing keeps
 * the Auth.js contract while carrying a `code` the login page can read.
 */
class DatabaseUnavailableError extends CredentialsSignin {
  code = "db_unavailable";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        try {
          await connectToDatabase();
          const settings = await getSettings();
          const maxAttempts = Number(settings.login_max_attempts) || 5;
          const lockoutMinutes = Number(settings.login_lockout_minutes) || 15;

          const user = await User.findOne({ email }).populate("roleId");

          // Spend comparable time on the unknown-email path so response timing
          // does not reveal whether the account exists.
          if (!user || !user.passwordHash) {
            await bcrypt.compare(password, "$2a$10$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalidsa");
            return null;
          }

          if (user.isActive === false) return null;

          if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
            if (user.failedLoginAttempts >= maxAttempts) {
              user.lockedUntil = new Date(Date.now() + lockoutMinutes * 60_000);
              user.failedLoginAttempts = 0;
              void logActivity({
                userId: user._id.toString(),
                action: "ACCOUNT_LOCKED",
                module: "auth",
                after: { lockedUntil: user.lockedUntil },
              });
            }
            await user.save();
            return null;
          }

          // Employee-linked accounts inherit their posting from the employee record.
          let employeeId: string | null = null;
          let branchId: string | null = null;
          let divisionId: string | null = null;
          let employeeName: string | null = null;

          if (user.employeeId) {
            const employee = await Employee.findById(user.employeeId).select(
              "name status branchId divisionId"
            );
            if (!employee) return null;
            if (employee.status !== "active" && employee.status !== "onboarding") {
              return null; // suspended / resigned employees cannot sign in
            }
            employeeId = employee._id.toString();
            employeeName = employee.name;
            branchId = employee.branchId?.toString() ?? null;
            divisionId = employee.divisionId?.toString() ?? null;
          }

          const role = user.roleId as unknown as { name?: string } | null;
          if (!role?.name) return null;

          user.failedLoginAttempts = 0;
          user.lockedUntil = null;
          user.lastLoginAt = new Date();
          await user.save();

          void logActivity({
            userId: user._id.toString(),
            action: "LOGIN",
            module: "auth",
            after: { role: role.name },
          });

          return {
            id: user._id.toString(),
            email: user.email,
            name: employeeName ?? role.name,
            role: role.name,
            employeeId,
            branchId,
            divisionId,
            employeeName,
            mustChangePassword: Boolean(user.mustChangePassword),
          };
        } catch (error) {
          // An outage is not a credential failure. Returning null here would
          // tell the user their password is wrong while the database is simply
          // unreachable, so that case is re-raised with its own code.
          if (isDbUnreachable(error)) {
            console.error("[AUTH] database unreachable during sign-in:", (error as Error).message);
            throw new DatabaseUnavailableError();
          }
          console.error("[AUTH] authorize failed:", (error as Error).message);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
});
