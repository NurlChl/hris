"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Users, Sun, Moon, ArrowRight, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans relative overflow-hidden flex flex-col justify-between">
      
      {/* Sleek grid mask */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-900 dark:bg-white flex items-center justify-center font-bold text-white dark:text-slate-900 text-xs">
            H
          </div>
          <span className="font-bold tracking-tight text-xs uppercase text-slate-800 dark:text-white">HRIS</span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-md bg-slate-100 dark:bg-white/3 border border-slate-200 dark:border-white/8 hover:bg-slate-200 dark:hover:bg-white/5 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main hero */}
      <main className="max-w-4xl mx-auto w-full px-6 py-16 text-center relative z-10 flex flex-col items-center justify-center gap-10 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/3 border border-slate-200 dark:border-white/8 text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-550 dark:text-slate-400">
            Sistem HRIS Terintegrasi
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            Manajemen Operasional HR <br />Secara Mandiri & Efisien.
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-450 max-w-lg mx-auto leading-relaxed">
            Presensi mandiri terverifikasi Geofence, approval cuti dinamis, rekrutmen ATS terintegrasi, dan slip gaji transparan.
          </p>
        </motion.div>

        {/* Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl"
        >
          <Link
            href="/auth/login"
            className="group p-6 rounded-lg bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-white/8 hover:border-slate-400 dark:hover:border-white/20 transition-all text-left flex flex-col justify-between h-40 cursor-pointer shadow-sm hover:shadow"
          >
            <div className="space-y-2">
              <Users className="w-4 h-4 text-slate-800 dark:text-slate-200" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Portal Karyawan</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Absen harian, ajukan cuti, cek slip gaji bulanan.</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-900 dark:text-white group-hover:translate-x-1 transition-all mt-4">
              Masuk Portal &rarr;
            </div>
          </Link>

          <Link
            href="/career"
            className="group p-6 rounded-lg bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-white/8 hover:border-slate-400 dark:hover:border-white/20 transition-all text-left flex flex-col justify-between h-40 cursor-pointer shadow-sm hover:shadow"
          >
            <div className="space-y-2">
              <Briefcase className="w-4 h-4 text-slate-800 dark:text-slate-200" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Halaman Karir</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Lihat lowongan kerja aktif dan kirim berkas lamaran kerja.</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-900 dark:text-white group-hover:translate-x-1 transition-all mt-4">
              Cari Lowongan &rarr;
            </div>
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full px-6 py-6 text-center text-[10px] text-slate-550 dark:text-slate-400 border-t border-slate-200/40 dark:border-white/4 relative z-10 font-mono">
        <p>&copy; {new Date().getFullYear()} HRIS System. All rights reserved.</p>
      </footer>
    </div>
  );
}
