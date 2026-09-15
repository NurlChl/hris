"use client";

import React, { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell, PasswordInput } from "@/components/auth/AuthShell";
import { Alert, Button, Field, Input } from "@/components/ui";

/**
 * NextAuth reports every credential failure as `CredentialsSignin`; the server
 * deliberately does not distinguish "unknown email" from "wrong password" or
 * "account locked", so the copy here has to cover all three without guessing.
 */
function messageFor(code: string | null): string {
  if (!code) return "";
  switch (code) {
    case "CredentialsSignin":
    case "Callback":
      return "Email atau kata sandi salah. Setelah beberapa percobaan gagal, akun akan terkunci sementara demi keamanan.";
    case "SessionRequired":
      return "Sesi Anda telah berakhir. Silakan masuk kembali.";
    case "AccessDenied":
      return "Akun Anda tidak memiliki akses ke halaman tersebut.";
    default:
      return "Tidak dapat memproses login saat ini. Coba lagi beberapa saat lagi.";
  }
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/portal/attendance";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(messageFor(params.get("error")));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email: email.trim(),
      password,
    }).catch(() => null);

    if (!res || res.error) {
      setError(messageFor(res?.error ?? "CredentialsSignin"));
      setLoading(false);
      return;
    }

    // A full navigation rather than a soft push, so the session cookie is read
    // by the proxy before the destination renders.
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <AuthShell
      badge="Portal Karyawan"
      title="Masuk ke akun Anda"
      subtitle="Gunakan email kantor dan kata sandi yang diberikan HRD."
      footer={
        <>
          Administrator?{" "}
          <Link href="/auth/admin" className="font-semibold text-primary hover:underline">
            Masuk lewat panel admin
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}

        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@perusahaan.com"
          />
        </Field>

        <Field label="Kata sandi" htmlFor="password" required>
          <PasswordInput id="password" value={password} onChange={setPassword} placeholder="••••••••" />
        </Field>

        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Lupa kata sandi?
          </Link>
        </div>

        <Button type="submit" loading={loading} className="w-full justify-center" size="lg">
          {loading ? "Memverifikasi…" : "Masuk"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-background">
          <div className="skeleton w-64 h-40 rounded-xl" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
