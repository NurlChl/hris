"use client";

import React, { useState, Suspense, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Mail, Eye, EyeOff, Loader2, Sun, Moon, Key } from "lucide-react";
import { motion } from "framer-motion";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const getErrorMessage = (err: string | null) => {
    if (!err) return "";
    if (err === "CredentialsSignin" || err === "Callback" || err === "Configuration") {
      return "Email atau password salah. Silakan periksa kembali.";
    }
    if (err === "SessionRequired") {
      return "Sesi telah habis. Silakan login kembali.";
    }
    return "Terjadi kesalahan masuk. Silakan coba lagi.";
  };

  const [error, setError] = useState(getErrorMessage(errorParam));
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const activeTheme = savedTheme || "dark";
    setTheme(activeTheme);
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Email atau password salah. Silakan periksa kembali.");
        setLoading(false);
      } else {
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setError("Terjadi kesalahan masuk. Silakan coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans relative overflow-hidden">
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md bg-slate-100 dark:bg-white/3 border border-slate-200 dark:border-white/8 hover:bg-slate-200 dark:hover:bg-white/5 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-8 rounded-xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-white/8 shadow-md relative z-10 mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-slate-100 dark:bg-white/3 border border-slate-200 dark:border-white/8 mb-4">
            <Shield className="w-5 h-5 text-slate-800 dark:text-slate-200" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Portal Administrasi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-550 dark:text-slate-400 mt-1">Akses masuk khusus Superadmin, HRD, & Direksi</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400 text-xs mb-6 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Email Administratif</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-550 dark:text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@perusahaan.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/8 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-white/20 transition-all placeholder:text-slate-550 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Kata Sandi</label>
              <Link href="/auth/forgot-password" className="text-slate-500 hover:text-slate-850 dark:text-slate-550 dark:text-slate-400 dark:hover:text-white underline">Lupa Password?</Link>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-slate-550 dark:text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/8 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-white/20 transition-all placeholder:text-slate-550 dark:placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-550 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk ke Dashboard"}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-100 dark:border-white/4">
          <Link href="/auth/login" className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-slate-550 dark:text-slate-400 dark:hover:text-slate-200 font-medium">
            &larr; Masuk sebagai Karyawan Biasa
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#07080d] text-slate-450">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  );
}
