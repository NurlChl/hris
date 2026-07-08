"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  User, KeyRound, ShieldCheck, Mail, Loader2, AlertCircle, CheckCircle2, 
  Sun, Moon, Lock, Info, ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Change password states
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

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

  const fetchProfile = async () => {
    if (!session?.user?.employeeId) {
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/v1/employees/${session.user.employeeId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
      }
    } catch (err) {
      console.error("Gagal memuat profil:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSendOTP = async () => {
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/v1/auth/change-password-verify", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage("Kode verifikasi OTP telah dikirim ke email Anda");
        setOtpSent(true);
      } else {
        setErrorMessage(data.error?.message || "Gagal mengirim kode verifikasi");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage("Kata sandi Anda berhasil diperbarui!");
        setCode("");
        setNewPassword("");
        setOtpSent(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal mengubah kata sandi");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] flex items-center justify-center text-slate-550 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans p-6 md:p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Profil Saya & Pengaturan Keamanan
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-550 dark:text-slate-400 mt-1">
              Kelola informasi profil pribadi Anda dan perbarui kata sandi dengan aman.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/portal/attendance")}
              className="px-4 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-300 dark:border-white/8 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/4 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
            >
              Portal Presensi
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-200/50 dark:bg-white/3 border border-slate-300/40 dark:border-white/8 hover:bg-slate-200 dark:hover:bg-white/8 transition-all cursor-pointer text-slate-600 dark:text-slate-300"
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Profile Card Section */}
          <div className="bg-white dark:bg-white/2 border border-slate-200 dark:border-white/6 rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-white/4 flex items-center gap-1.5">
              <User className="w-4.5 h-4.5 text-slate-700 dark:text-slate-300" /> Informasi Karyawan
            </h2>

            {loadingProfile ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-800 dark:text-slate-200" />
              </div>
            ) : profile ? (
              <div className="space-y-4 text-xs text-slate-600 dark:text-slate-550 dark:text-slate-400">
                <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-white/1 border border-slate-200 dark:border-white/4 space-y-2">
                  <p className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">Biodata Diri</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{profile.name}</p>
                  <p className="font-mono">NIP: {profile.employeeId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-550 dark:text-slate-400 block font-semibold uppercase tracking-wider">Cabang Kantor</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.branchId?.name || "-"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-550 dark:text-slate-400 block font-semibold uppercase tracking-wider">Jabatan</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.positionId?.name || "-"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-550 dark:text-slate-400 block font-semibold uppercase tracking-wider">Email Kantor</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.officeEmail}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                {!session?.user?.employeeId 
                  ? "Akun Anda adalah akun sistem (Superadmin) dan tidak terhubung ke profil data karyawan." 
                  : "Profil karyawan tidak ditemukan."}
              </p>
            )}
          </div>

          {/* Change Password Section */}
          <div className="bg-white dark:bg-white/2 border border-slate-200 dark:border-white/6 rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-white/4 flex items-center gap-1.5">
              <Lock className="w-4.5 h-4.5 text-purple-500" /> Perbarui Kata Sandi
            </h2>

            {!otpSent ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-500/2 border border-blue-500/10 text-slate-500 dark:text-slate-550 dark:text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-700 dark:text-slate-300" />
                  <span>Untuk alasan keamanan, ganti password wajib memverifikasi email Anda terlebih dahulu dengan kode OTP.</span>
                </div>
                <button
                  onClick={handleSendOTP}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Kirim Kode Verifikasi ke Email
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-300">Kode Verifikasi OTP (6 Digit)</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-3 w-4 h-4 text-slate-550 dark:text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="123456"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/50 dark:bg-white/2 border border-slate-300 dark:border-white/8 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono tracking-widest placeholder:text-slate-550 dark:placeholder:text-slate-600"
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
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/50 dark:bg-white/2 border border-slate-300 dark:border-white/8 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-550 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-white/8 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Simpan Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
