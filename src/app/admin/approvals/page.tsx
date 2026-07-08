"use client";

import React, { useState, useEffect } from "react";
import { 
  FileCheck2, ShieldCheck, CheckCircle2, Ban, X, Loader2, AlertCircle, 
  Hourglass, MessageSquare, ClipboardCheck, CornerDownRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StepStatus {
  stepNumber: number;
  approverRole: string;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  actionedAt?: string;
}

interface ApprovalItem {
  _id: string;
  refType: "leave" | "correction" | "holiday_swap";
  refId: string;
  currentStep: number;
  status: "pending" | "approved" | "rejected";
  requesterName: string;
  requesterNip: string;
  createdAt: string;
  steps: StepStatus[];
  details?: any;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/approvals");
      const data = await res.json();
      if (data.success) {
        setApprovals(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat persetujuan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (item: ApprovalItem) => {
    setSelectedApproval(item);
    setComment("");
    setErrorMessage("");
    setSuccessMessage("");
    setModalOpen(true);
  };

  const handleCloseReview = () => setModalOpen(false);

  const handleAction = async (action: "approve" | "reject") => {
    if (!selectedApproval) return;
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/v1/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: selectedApproval._id,
          action,
          comment,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage(data.message || "Tindakan berhasil diproses!");
        fetchApprovals();
        setTimeout(() => setModalOpen(false), 1500);
      } else {
        setErrorMessage(data.error?.message || "Gagal memproses tindakan");
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan koneksi server");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Antrean Persetujuan</h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Review dan tindak lanjuti pengajuan izin/cuti, koreksi absensi, dan jadwal tukar libur karyawan</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-550 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <FileCheck2 className="w-8 h-8 mb-2 opacity-50 text-slate-600" />
          <p className="text-sm font-medium">Antrean persetujuan kosong</p>
          <p className="text-xs mt-1">Semua pengajuan yang membutuhkan persetujuan peran Anda saat ini sudah bersih.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((item) => (
            <div
              key={item._id}
              className="bg-white border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl p-5 hover:border-white/12 hover:bg-white dark:bg-white/3 transition-all duration-300 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">{item.requesterName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({item.requesterNip})</span>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs text-slate-550 dark:text-slate-400 items-center">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold text-[9px] uppercase">
                    {item.refType === "leave" ? "Cuti / Izin" : item.refType === "correction" ? "Koreksi Absen" : item.refType}
                  </span>
                  <span>&bull;</span>
                  <span>Diajukan: {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>

                {/* Stepper display of approval roles */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {item.steps.map((st, i) => (
                    <div key={st.stepNumber} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      {i > 0 && <CornerDownRight className="w-3.5 h-3.5 text-slate-750 dark:text-slate-400" />}
                      <span className={`px-1.5 py-0.5 rounded font-bold border ${
                        st.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : st.status === "rejected"
                          ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                          : st.stepNumber === item.currentStep
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-200 dark:border-white/10 animate-pulse"
                          : "bg-slate-50 dark:bg-white/2 border-slate-200/60 dark:border-white/4 text-slate-550 dark:text-slate-400"
                      }`}>
                        {st.approverRole}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleOpenReview(item)}
                className="px-4 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-100 hover:bg-white/4 transition-all cursor-pointer w-fit shrink-0 self-end md:self-center"
              >
                Tinjau Pengajuan
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal Dialog */}
      <AnimatePresence>
        {modalOpen && selectedApproval && (
          <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={handleCloseReview} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 shadow-2xl rounded-2xl w-full max-w-md relative z-10 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4 mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Proses Persetujuan Pengajuan</h3>
                <button onClick={handleCloseReview} className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer">
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

              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                <div className="p-4 rounded-xl bg-white/1 border border-slate-200 dark:border-white/4 space-y-2">
                  <p className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Detail Pengaju</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{selectedApproval.requesterName}</p>
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-mono">NIP: {selectedApproval.requesterNip}</p>
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">Jenis Transaksi: <span className="font-bold capitalize bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/8">{selectedApproval.refType === "correction" ? "Koreksi Absen" : selectedApproval.refType}</span></p>
                </div>

                {selectedApproval.details && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/4 space-y-2">
                    <p className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Detail Pengajuan</p>
                    {selectedApproval.refType === "leave" ? (
                      <>
                        <p><strong className="text-slate-900 dark:text-slate-200">Jenis Cuti:</strong> {selectedApproval.details.leaveTypeName}</p>
                        <p><strong className="text-slate-900 dark:text-slate-200">Mulai:</strong> {new Date(selectedApproval.details.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                        <p><strong className="text-slate-900 dark:text-slate-200">Selesai:</strong> {new Date(selectedApproval.details.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                        <p><strong className="text-slate-900 dark:text-slate-200">Alasan:</strong> {selectedApproval.details.reason}</p>
                      </>
                    ) : selectedApproval.refType === "correction" ? (
                      <>
                        <p><strong className="text-slate-900 dark:text-slate-200">Tanggal Absen:</strong> {new Date(selectedApproval.details.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                        <p><strong className="text-slate-900 dark:text-slate-200">Koreksi Jam:</strong> {selectedApproval.details.clockInTime} - {selectedApproval.details.clockOutTime}</p>
                        <p><strong className="text-slate-900 dark:text-slate-200">Kategori:</strong> <span className="capitalize">{selectedApproval.details.reasonType?.replace(/_/g, " ")}</span></p>
                        <p><strong className="text-slate-900 dark:text-slate-200">Alasan:</strong> {selectedApproval.details.reasonNote}</p>
                      </>
                    ) : null}
                    {selectedApproval.details.evidenceUrl && (
                      <p className="pt-1">
                        <a href={selectedApproval.details.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold flex items-center gap-1">
                          &bull; Lihat Dokumen Bukti
                        </a>
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    Catatan / Komentar Peninjau (Opsional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Tulis alasan persetujuan atau penolakan..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs placeholder:text-slate-600"
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-white/4 mt-6">
                  <button
                    onClick={() => handleAction("reject")}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow shadow-red-500/20 active:scale-[0.98] cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    Tolak Pengajuan
                  </button>
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow shadow-emerald-500/20 active:scale-[0.98] cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                    Setujui Langkah
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
