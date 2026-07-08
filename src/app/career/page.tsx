"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, ArrowLeft, Loader2, AlertCircle, CheckCircle, FileText, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Position {
  _id: string;
  name: string;
  divisionId?: { 
    _id: string; 
    name: string;
    branchId?: { _id: string; name: string } | null;
  } | null;
  description?: string;
  location?: string;
  type?: string;
}

export default function CareerPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/public/positions");
      const data = await res.json();
      if (data.success) {
        setPositions(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat lowongan kerja:", err);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans relative overflow-hidden flex flex-col justify-between">
      {/* Sleek grid mask */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-5xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Beranda
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-900 dark:bg-white flex items-center justify-center font-bold text-white dark:text-slate-900 text-xs">
            H
          </div>
          <span className="font-bold tracking-tight text-xs uppercase text-slate-800 dark:text-white">HRIS Careers</span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 relative z-10 flex-1 flex flex-col gap-10">
        <div className="space-y-3 text-center">
          <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/3 border border-slate-200 dark:border-white/8 text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Peluang Karir
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Temukan Karir Impian Anda
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Bergabunglah bersama tim profesional kami dan berkontribusi secara nyata dalam menciptakan solusi teknologi masa depan.
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-900 dark:text-white" />
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-xl">
            <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada lowongan pekerjaan aktif saat ini.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {positions.map((job) => (
              <div
                key={job._id}
                className="p-6 bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-white/8 rounded-xl shadow-xs hover:border-slate-350 dark:hover:border-white/20 transition-all flex flex-col justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-slate-100 dark:bg-white/3 text-slate-700 dark:text-slate-300">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{job.name}</h3>
                      <p className="text-[9px] font-mono text-slate-400 dark:text-slate-550 mt-0.5">
                        {job.divisionId?.name || "Umum"} &bull; {job.divisionId?.branchId?.name || "Semua Cabang"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed min-h-[48px]">
                    {job.description 
                      ? (job.description.length > 120 ? job.description.slice(0, 120) + "..." : job.description)
                      : `Kami sedang mencari profesional yang berdedikasi tinggi untuk mengisi posisi ${job.name} di tim kami.`}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/4 text-[9px] font-semibold text-slate-550 dark:text-slate-450">{job.type || "Full-Time"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/4 text-[9px] font-semibold text-slate-550 dark:text-slate-455">{job.location || "Jakarta"}</span>
                  </div>
                </div>

                <Link
                  href={`/career/${job._id}`}
                  className="w-full py-2.5 text-xs rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer text-center transition-all block font-bold"
                >
                  Detail & Lamar Lowongan
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full px-6 py-6 text-center text-[10px] text-slate-550 dark:text-slate-400 dark:text-slate-650 border-t border-slate-200/40 dark:border-white/4 relative z-10 font-mono">
        <p>&copy; {new Date().getFullYear()} HRIS System. All rights reserved.</p>
      </footer>
    </div>
  );
}
