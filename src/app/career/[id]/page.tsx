"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Briefcase, ArrowLeft, Loader2, AlertCircle, CheckCircle, 
  MapPin, Clock, Building2, Send, X, FileText 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Position {
  _id: string;
  name: string;
  divisionId?: { _id: string; name: string } | null;
  description?: string;
  jobdesk?: string;
  requirements?: string;
  location?: string;
  type?: string;
}

export default function CareerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (id) {
      fetchJobDetail();
    }
  }, [id]);

  const fetchJobDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/public/positions?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setPosition(data.data);
      } else {
        setErrorMessage(data.error?.message || "Gagal memuat detail pekerjaan");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) return;

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/v1/public/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          positionId: position._id,
          cvUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage("Lamaran Anda berhasil dikirim! Kami akan menghubungi Anda melalui email.");
        setName("");
        setEmail("");
        setPhone("");
        setCvUrl("");
      } else {
        setErrorMessage(data.error?.message || "Gagal mengirimkan lamaran.");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900 dark:text-white" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] flex flex-col items-center justify-center p-6 text-center text-xs">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Detail Lowongan Tidak Ditemukan</h3>
        <p className="text-slate-550 dark:text-slate-400 mb-6">Lowongan kerja tersebut mungkin sudah ditutup atau tidak aktif lagi.</p>
        <Link href="/career" className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-lg hover:bg-slate-800 transition-all">
          Kembali ke Karir
        </Link>
      </div>
    );
  }

  // Parse lines for list representation
  const jobdeskLines = position.jobdesk ? position.jobdesk.split("\n").filter(l => l.trim() !== "") : [];
  const reqLines = position.requirements ? position.requirements.split("\n").filter(l => l.trim() !== "") : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans relative overflow-hidden flex flex-col justify-between">
      {/* Sleek grid mask */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-4xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <Link href="/career" className="flex items-center gap-2 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Karir
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-900 dark:bg-white flex items-center justify-center font-bold text-white dark:text-slate-900 text-xs">
            H
          </div>
          <span className="font-bold tracking-tight text-xs uppercase text-slate-800 dark:text-white">HRIS Careers</span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto w-full px-6 py-8 relative z-10 flex-1 flex flex-col gap-6">
        <div className="bg-white dark:bg-[#0c0d12] border border-slate-200/60 dark:border-white/8 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Header Job Info */}
          <div className="border-b border-slate-250 dark:border-white/5 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-mono font-bold uppercase text-blue-500">
                  {position.type || "Full-Time"}
                </span>
                <span className="text-slate-400 dark:text-slate-655">&bull;</span>
                <span className="text-[10px] font-semibold text-slate-550 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> {position.divisionId?.name || "Umum"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {position.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-xs text-slate-550 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" /> {position.location || "Jakarta"}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-slate-400" /> Penempatan Segera</span>
              </div>
            </div>
            <button
              onClick={() => {
                setApplyOpen(true);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer shrink-0 text-center"
            >
              Lamar Posisi Ini
            </button>
          </div>

          {/* Description */}
          {position.description && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Deskripsi Pekerjaan</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line font-medium">
                {position.description}
              </p>
            </div>
          )}

          {/* Jobdesk */}
          {jobdeskLines.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Tanggung Jawab Utama</h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                {jobdeskLines.map((line, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start">
                    <span className="text-blue-500 font-bold text-sm leading-none shrink-0">&bull;</span>
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {reqLines.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Kebutuhan / Kriteria Pelamar</h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                {reqLines.map((line, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start">
                    <span className="text-emerald-500 font-bold text-sm leading-none shrink-0">&bull;</span>
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full px-6 py-6 text-center text-[10px] text-slate-550 dark:text-slate-400 dark:text-slate-650 border-t border-slate-200/40 dark:border-white/4 relative z-10 font-mono">
        <p>&copy; {new Date().getFullYear()} HRIS System. All rights reserved.</p>
      </footer>

      {/* Apply Modal */}
      <AnimatePresence>
        {applyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setApplyOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-white/8 rounded-xl p-6 w-full max-w-md relative z-10 shadow-2xl flex flex-col gap-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Kirim Lamaran Kerja</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Posisi: {position.name}</p>
                </div>
                <button
                  onClick={() => setApplyOpen(false)}
                  className="p-1 rounded bg-slate-100 dark:bg-white/4 hover:bg-slate-200 dark:hover:bg-white/8 transition-all text-slate-550 dark:text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage ? (
                <div className="py-6 text-center space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Lamaran Terkirim!</h4>
                  <p className="text-[11px] text-slate-550 dark:text-slate-400">{successMessage}</p>
                  <button
                    onClick={() => {
                      setApplyOpen(false);
                      router.push("/career");
                    }}
                    className="mt-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
                  >
                    Tutup & Kembali
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/6 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Alamat Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@domain.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/6 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Nomor Telepon / HP</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/6 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Tautan CV (URL PDF/Drive)</label>
                    <input
                      type="url"
                      required
                      value={cvUrl}
                      onChange={(e) => setCvUrl(e.target.value)}
                      placeholder="https://drive.google.com/.../cv.pdf"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/6 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="border-t border-slate-200 dark:border-white/4 pt-4 mt-4 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setApplyOpen(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-white/6 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-white/4 cursor-pointer text-slate-550 dark:text-slate-300"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Kirim Lamaran
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
