import NextAuth, { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import Role from "@/models/Role";
import Employee from "@/models/Employee";
import { connectToDatabase } from "@/lib/db";
import { authConfig } from "./auth.config";

// Extend NextAuth types to include custom session properties
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      employeeId: string | null;
      branchId?: string | null;
      divisionId?: string | null;
    } & DefaultSession["user"]
  }

  interface User {
    id?: string;
    role?: string;
    employeeId?: string | null;
    branchId?: string | null;
    divisionId?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "karyawan@perusahaan.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Authorize started for:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing credentials");
          return null;
        }

        try {
          await connectToDatabase();
          console.log("[AUTH] Connected to Database");

          // Find user by email and populate role
          const user = await User.findOne({ email: credentials.email }).populate("roleId");
          if (!user) {
            console.log("[AUTH] User not found in database for email:", credentials.email);
            return null;
          }
          console.log("[AUTH] User found:", user.email, "with roleId:", user.roleId);

          // Verify password
          const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);
          console.log("[AUTH] Password verification result:", isValid);
          if (!isValid) {
            console.log("[AUTH] Password hash comparison failed");
            return null;
          }

          // If employee account, fetch employee info (branch, division, status)
          let employeeId = null;
          let branchId = null;
          let divisionId = null;

          if (user.employeeId) {
            const employee = await Employee.findById(user.employeeId);
            if (employee) {
              if (employee.status !== "active" && employee.status !== "onboarding") {
                console.log("[AUTH] Employee is inactive, blocking login");
                return null;
              }
              employeeId = employee._id.toString();
              branchId = employee.branchId?.toString() || null;
              divisionId = employee.divisionId?.toString() || null;
            }
          }

          const role = user.roleId as any;
          if (!role) {
            console.log("[AUTH] User role could not be resolved");
            return null;
          }

          console.log("[AUTH] Authorize success! Returning session user with role:", role.name);
          return {
            id: user._id.toString(),
            email: user.email,
            name: role.name, // Return the role name as name
            role: role.name,
            employeeId,
            branchId,
            divisionId,
          };
        } catch (error: any) {
          console.error("[AUTH] Unexpected error in authorize callback:", error.message);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "default-very-long-secret-key-for-jwt-signing-and-auth",
});
