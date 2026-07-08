"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, ShieldCheck, KeyRound, Loader2, Sun, Moon, ArrowLeft, Key } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [step, setStep] = useState<1 | 2>(1); // 1: input email, 2: input OTP & new pass
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
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

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Kode OTP telah dikirim");
        setStep(2);
      } else {
        setError(data.error?.message || "Gagal memproses permintaan");
      }
    } catch (err) {
      setError("Kesalahan koneksi ke server");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Password berhasil diatur ulang");
        setCode("");
        setNewPassword("");
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 2000);
      } else {
        setError(data.error?.message || "Gagal mengatur ulang password");
      }
    } catch (err) {
      setError("Kesalahan koneksi ke server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />

      {/* Theme Switcher Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-200/50 dark:bg-white/3 border border-slate-300/40 dark:border-white/8 hover:bg-slate-200 dark:hover:bg-white/8 transition-all cursor-pointer text-slate-600 dark:text-slate-300"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-white/2 border border-slate-200 dark:border-white/6 shadow-xl relative z-10 mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 mb-4 shadow-lg shadow-blue-500/25">
            <Key className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-sans">
            Atur Ulang Password
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-550 dark:text-slate-400 mt-1">
            {step === 1 ? "Masukkan email terdaftar untuk menerima kode verifikasi OTP" : "Masukkan kode verifikasi OTP 6 digit & password baru"}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-6 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs mb-6 text-center">
            {success}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">Alamat Email Terdaftar</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-550 dark:text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/50 dark:bg-white/2 border border-slate-300 dark:border-white/8 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-550 dark:placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-xs"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim Kode OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">Kode Verifikasi OTP</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-3 w-4 h-4 text-slate-550 dark:text-slate-400" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/50 dark:bg-white/2 border border-slate-300 dark:border-white/8 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono tracking-widest placeholder:text-slate-550 dark:placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">Kata Sandi Baru</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-550 dark:text-slate-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/50 dark:bg-white/2 border border-slate-300 dark:border-white/8 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-550 dark:placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-xs"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verifikasi & Reset"}
            </button>
          </form>
        )}

        <div className="text-center mt-6 pt-4 border-t border-slate-200 dark:border-white/4">
          <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Halaman Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
