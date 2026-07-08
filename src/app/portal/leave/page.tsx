"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Calendar, CalendarDays, Loader2, AlertCircle, FileText, CheckCircle2, 
  Hourglass, Ban, Plus, X, UploadCloud, History as HistoryIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchSelect from "@/components/SearchSelect";

interface LeaveType { _id: string; name: string; requiresEvidence: boolean; minLeadDays: number; }
interface LeaveBalance {
  _id: string;
  leaveTypeId: LeaveType;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}
interface LeaveRequest {
  _id: string;
  leaveTypeId: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function LeavePortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Modal States
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form Inputs
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated") {
      fetchLeaveData();
    }
  }, [status]);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const [rData, rTypes] = await Promise.all([
        fetch("/api/v1/leave?type=balance"),
        fetch("/api/v1/leave?type=types")
      ]);
      const [dData, dTypes] = await Promise.all([
        rData.json(),
        rTypes.json()
      ]);
      if (dData.success) {
        setBalances(dData.data.balances || []);
        setHistory(dData.data.history || []);
      }
      if (dTypes.success) {
        setLeaveTypes(dTypes.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat data cuti:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    setLeaveTypeId(leaveTypes[0]?._id || "");
    setStartDate("");
    setEndDate("");
    setReason("");
    setEvidenceUrl("");
    setErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  };

  const handleCloseForm = () => setFormOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/v1/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveTypeId, startDate, endDate, reason, evidenceUrl }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage(data.message || "Pengajuan cuti berhasil dikirim!");
        fetchLeaveData();
        setTimeout(() => setFormOpen(false), 1500);
      } else {
        setErrorMessage(data.error?.message || "Gagal mengajukan cuti");
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan koneksi server");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center text-slate-550 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-200 p-6 md:p-12 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-slate-500/2 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-slate-500/2 blur-[120px]" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Portal Pengajuan Cuti & Izin
            </h1>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
              Pantau sisa kuota cuti tahunan Anda, ajukan izin sakit, dan lihat riwayat pengajuan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/portal/attendance")}
              className="px-4 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-100 hover:bg-white/4 transition-all cursor-pointer"
            >
              Portal Presensi
            </button>
            <button
              onClick={handleOpenForm}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 transition-all border border-slate-900 dark:border-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Ajukan Cuti / Izin
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-550 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Balances grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {balances.map(b => (
                <div key={b._id} className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-2xl p-5 hover:border-white/12 transition-all">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                    {b.leaveTypeId?.name || "Jenis Cuti"}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-200 mt-2">{b.remainingDays} Hari</h3>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/4 text-[10px] text-slate-550 dark:text-slate-400">
                    <div>
                      <span className="text-slate-500 block">Jatah</span>
                      <span className="font-semibold">{b.allocatedDays}d</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Terpakai</span>
                      <span className="font-semibold">{b.usedDays}d</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pending</span>
                      <span className="font-semibold">{b.pendingDays}d</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Historical list */}
            <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-white/4 flex items-center gap-1.5">
                <HistoryIcon className="w-4.5 h-4.5 text-slate-700 dark:text-slate-300" /> Riwayat Pengajuan
              </h2>

              {history.length === 0 ? (
                <div className="h-32 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
                  <CalendarDays className="w-8 h-8 mb-2 opacity-50 text-slate-600" />
                  Belum ada riwayat pengajuan cuti.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(req => {
                    const start = new Date(req.startDate).toLocaleDateString("id-ID", { month: "short", day: "numeric" });
                    const end = new Date(req.endDate).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
                    return (
                      <div key={req._id} className="flex items-center justify-between p-4 bg-white/1 border border-slate-200 dark:border-white/4 rounded-xl hover:border-slate-200 dark:hover:border-white/8 transition-all">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-350 border border-slate-200 dark:border-white/8 font-semibold text-[9px] uppercase">
                            {req.leaveTypeId?.name || "Izin"}
                          </span>
                          <p className="text-xs text-slate-550 dark:text-slate-400">{start} - {end}</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 mt-1 italic">"{req.reason}"</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 capitalize ${
                            req.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : req.status === "rejected"
                              ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          }`}>
                            {req.status === "approved" ? <CheckCircle2 className="w-3.5 h-3.5" /> : req.status === "rejected" ? <Ban className="w-3.5 h-3.5" /> : <Hourglass className="w-3.5 h-3.5" />}
                            {req.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={handleCloseForm} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 shadow-2xl rounded-2xl w-full max-w-md relative z-10 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4 mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Ajukan Cuti / Izin</h3>
                <button onClick={handleCloseForm} className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <SearchSelect
                  label="Pilih Jenis Cuti"
                  value={leaveTypeId}
                  onChange={setLeaveTypeId}
                  options={leaveTypes.map(t => ({ label: `${t.name} (H-${t.minLeadDays})`, value: t._id }))}
                  placeholder="Pilih jenis cuti..."
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">Tanggal Mulai</label>
                    <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">Tanggal Selesai</label>
                    <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">Alasan / Keterangan</label>
                  <textarea required value={reason} onChange={e => setReason(e.target.value)} placeholder="Tulis alasan pengajuan cuti secara singkat..." rows={3} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs placeholder:text-slate-600" />
                </div>

                {/* Evidence Upload Placeholder */}
                {leaveTypes.find(t => t._id === leaveTypeId)?.requiresEvidence && (
                  <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-white/8 bg-white/1 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white dark:bg-white/2 transition-all">
                    <UploadCloud className="w-6 h-6 text-slate-500 mb-1" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[10px]">Lampirkan Bukti Dokumen</span>
                    <span className="text-[9px] text-slate-500 italic mt-0.5">Wajib menyertakan Surat Keterangan Dokter/Bukti Sah.</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/4 mt-6">
                  <button type="button" onClick={handleCloseForm} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-slate-200 hover:bg-white dark:bg-white/2 cursor-pointer transition-all">Batal</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-xs">
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Ajukan Cuti
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
