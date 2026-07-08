"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Search, Calendar, ChevronRight, UserPlus, Info, Check, Ban, X, Loader2, 
  AlertCircle, FileText, ArrowRight, Building2, CalendarDays, ExternalLink, Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchSelect from "@/components/SearchSelect";

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  positionId: { _id: string; name: string; } | null;
  currentStage: string;
  status: "pending" | "in_progress" | "passed" | "rejected" | "on_hold";
  cvUrl?: string;
  notes?: string;
  offeringSalary?: number;
  history: Array<{
    stage: string;
    status: string;
    notes: string;
    createdAt: string;
  }>;
}

interface Position { _id: string; name: string; }
interface Branch { _id: string; name: string; }
interface Division { _id: string; name: string; }

const DEFAULT_STAGES = [
  "Apply",
  "Screening CV",
  "Interview HRD",
  "Offering",
  "Onboarding"
];

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState<"candidates" | "jobs">("candidates");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pipelines state
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [pipelinesLoading, setPipelinesLoading] = useState(false);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [selectedPipelinePositionId, setSelectedPipelinePositionId] = useState("");
  const [pipelineStages, setPipelineStages] = useState<string[]>([]);
  const [newStageInput, setNewStageInput] = useState("");

  // Modals
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [positionId, setPositionId] = useState("");

  // Migration states
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [joinDate, setJoinDate] = useState("");

  const [actionStage, setActionStage] = useState("");
  const [actionStatus, setActionStatus] = useState<"pending" | "in_progress" | "passed" | "rejected" | "on_hold">("passed");
  const [actionNotes, setActionNotes] = useState("");
  const [offeringSalary, setOfferingSalary] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchMetadata();
    if (activeTab === "candidates") {
      fetchCandidates();
    } else {
      fetchPipelines();
    }
  }, [activeTab]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/recruitment");
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat kandidat:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelines = async () => {
    setPipelinesLoading(true);
    try {
      const res = await fetch("/api/v1/recruitment?type=pipelines");
      const data = await res.json();
      if (data.success) {
        setPipelines(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat pipeline:", err);
    } finally {
      setPipelinesLoading(false);
    }
  };

  const handleSavePipeline = async () => {
    if (!selectedPipelinePositionId) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "save_pipeline",
          positionId: selectedPipelinePositionId,
          stages: pipelineStages
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchPipelines();
        setPipelineModalOpen(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal menyimpan pipeline");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [rPos, rBr, rDiv] = await Promise.all([
        fetch("/api/v1/positions"),
        fetch("/api/v1/branches"),
        fetch("/api/v1/divisions")
      ]);
      const [dPos, dBr, dDiv] = await Promise.all([
        rPos.json(),
        rBr.json(),
        rDiv.json()
      ]);
      if (dPos.success) setPositions(dPos.data);
      if (dBr.success) setBranches(dBr.data);
      if (dDiv.success) setDivisions(dDiv.data);
    } catch (err) {
      console.error("Gagal memuat meta:", err);
    }
  };

  const handleOpenAdd = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPositionId(positions[0]?._id || "");
    setErrorMessage("");
    setFormOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "create", name, email, phone, positionId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCandidates();
        setFormOpen(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal menambah pelamar");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetails = (c: Candidate) => {
    setSelectedCandidate(c);
    setActionStage(c.currentStage);
    setActionStatus(c.status);
    setActionNotes("");
    setOfferingSalary(c.offeringSalary || 0);
    setDetailsOpen(true);
  };

  const handleUpdateStage = async () => {
    if (!selectedCandidate) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "update_stage",
          id: selectedCandidate._id,
          stage: actionStage,
          status: actionStatus,
          notes: actionNotes,
          offeringSalary: actionStage === "Offering" ? offeringSalary : undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCandidates();
        setDetailsOpen(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal memperbarui tahapan");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMigrate = () => {
    setBranchId(branches[0]?._id || "");
    setDivisionId(divisions[0]?._id || "");
    setJoinDate(new Date().toISOString().split("T")[0]);
    setErrorMessage("");
    setMigrateOpen(true);
  };

  const handleMigrateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "migrate",
          id: selectedCandidate._id,
          branchId,
          divisionId,
          joinDate
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCandidates();
        setMigrateOpen(false);
        setDetailsOpen(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal melakukan onboarding karyawan");
      }
    } catch (err) {
      setErrorMessage("Kesalahan koneksi ke server");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.positionId?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-white/4 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recruitment & ATS Pipeline</h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Pantau pipeline pelamar kerja, jadwalkan tes, dan migrasikan pelamar yang lulus menjadi karyawan baru</p>
        </div>
        {activeTab === "candidates" && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all w-fit"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Pelamar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/8 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("candidates")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "candidates" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" }`}
        >
          <Users className="w-3.5 h-3.5" />
          Kandidat Pelamar
        </button>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "jobs" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Kelola Lowongan (Loker)
        </button>
      </div>

      {activeTab === "candidates" ? (
        <>
          <div className="flex items-center relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari pelamar, lowongan..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500"
            />
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-550 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Users className="w-8 h-8 mb-2 opacity-50 text-slate-600" />
              <p className="text-sm font-medium">Pelamar tidak ditemukan</p>
              <p className="text-xs mt-1">Belum ada pelamar baru atau sesuaikan kata kunci pencarian.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
  
          {DEFAULT_STAGES.map(stage => {
            const list = filteredCandidates.filter(c => c.currentStage === stage);
            return (
              <div key={stage} className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl p-4 flex flex-col gap-3 min-h-[300px]">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-2 mb-1">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">{stage}</h3>
                  <span className="px-1.5 py-0.5 rounded bg-white/4 text-[9px] font-bold text-slate-550 dark:text-slate-400">{list.length}</span>
                </div>

                <div className="flex-1 space-y-3">
                  {list.map(c => (
                    <div
                      key={c._id}
                      onClick={() => handleOpenDetails(c)}
                      className="p-3 bg-white border border-slate-200 dark:border-white/4 rounded-lg hover:border-white/12 hover:bg-white dark:bg-white/3 transition-all duration-200 cursor-pointer text-left space-y-2 group"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-all block">{c.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{c.positionId?.name || "Posisi Lain"}</span>
                      </div>

                      <div className="flex justify-between items-center text-[9px]">
                        <span className="capitalize text-slate-500 font-mono">Src: {c.source.replace(/_/g, " ")}</span>
                        <span className={`px-1 rounded font-semibold capitalize ${
                          c.status === "passed"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : c.status === "rejected"
                            ? "bg-red-500/10 text-red-700 dark:text-red-400"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
    ) : (
      <div className="space-y-4">
        {pipelinesLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-550 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
          </div>
        ) : positions.length === 0 ? (
          <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Briefcase className="w-8 h-8 mb-2 opacity-50 text-slate-600" />
            <p className="text-sm font-medium">Jabatan tidak ditemukan</p>
            <p className="text-xs mt-1">Buat jabatan/posisi terlebih dahulu di menu divisi & jabatan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positions.map(pos => {
              const pipe = pipelines.find(p => p.positionId?._id === pos._id || p.positionId === pos._id);
              const stages = pipe?.stages || DEFAULT_STAGES;

              return (
                <div key={pos._id} className="p-5 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 rounded-xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">{pos.name}</h3>
                    <div className="flex flex-wrap gap-1.5 items-center text-[10px] text-slate-550 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-350">Tahapan:</span>
                      {stages.map((st: string, idx: number) => (
                        <span key={st} className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/4 text-slate-800 dark:text-slate-300 font-semibold text-[9px]">{st}</span>
                          {idx < stages.length - 1 && <ChevronRight className="w-3 h-3 opacity-60" />}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPipelinePositionId(pos._id);
                      setPipelineStages(stages);
                      setNewStageInput("");
                      setErrorMessage("");
                      setPipelineModalOpen(true);
                    }}
                    className="w-fit px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg cursor-pointer transition-all border border-slate-200 dark:border-white/10"
                  >
                    Edit Tahapan Alur
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* Slide-over Details Panel */}
      <AnimatePresence>
        {detailsOpen && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-end font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setDetailsOpen(false)} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg h-full bg-white dark:bg-[#0a0c14] border-l border-slate-200/60 dark:border-white/8 shadow-2xl relative z-10 p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-200">Detail & Evaluasi Pelamar</h2>
                    <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1">Update tahapan evaluasi rekrutmen kandidat secara berkala</p>
                  </div>
                  <button onClick={() => setDetailsOpen(false)} className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Candidate Info */}
                <div className="p-4 rounded-xl bg-white/1 border border-slate-200 dark:border-white/4 space-y-2 text-xs">
                  <p className="font-bold text-slate-900 dark:text-slate-200 text-sm">{selectedCandidate.name}</p>
                  <p className="text-slate-550 dark:text-slate-400">Email: {selectedCandidate.email}</p>
                  <p className="text-slate-550 dark:text-slate-400">No. HP: {selectedCandidate.phone}</p>
                  <p className="text-slate-550 dark:text-slate-400 font-semibold">Lamaran Lowongan: {selectedCandidate.positionId?.name || "-"}</p>
                  {selectedCandidate.cvUrl && (
                    <a href={selectedCandidate.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white underline font-medium mt-1">
                      <FileText className="w-3.5 h-3.5" /> Lihat Berkas CV <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Evaluator Update Form */}
                <div className="space-y-4 text-xs border-t border-slate-200 dark:border-white/4 pt-4">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Update Evaluasi Tahapan</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-550 dark:text-slate-400 font-semibold">Tentukan Tahap</label>
                      <select value={actionStage} onChange={e => setActionStage(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0e1017] border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs">
                        {DEFAULT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-550 dark:text-slate-400 font-semibold">Status Tahap</label>
                      <select value={actionStatus} onChange={e => setActionStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0e1017] border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs">
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="passed">Passed (Lolos)</option>
                        <option value="rejected">Rejected (Gagal)</option>
                        <option value="on_hold">On Hold</option>
                      </select>
                    </div>
                  </div>

                  {actionStage === "Offering" && (
                    <div className="space-y-1">
                      <label className="text-slate-550 dark:text-slate-400 font-semibold">Negosiasi Gaji Offering (Rupiah)</label>
                      <input type="number" value={offeringSalary} onChange={e => setOfferingSalary(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-slate-550 dark:text-slate-400 font-semibold">Catatan Evaluasi / Interview</label>
                    <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} placeholder="Tulis hasil wawancara, catatan skor psikotes, dll..." rows={3} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs placeholder:text-slate-600" />
                  </div>

                  <button onClick={handleUpdateStage} disabled={submitting} className="px-4 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-100 hover:bg-white/4 cursor-pointer transition-all flex items-center gap-1.5 w-fit">
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Simpan Evaluasi
                  </button>
                </div>

                {/* Candidate History / Timeline */}
                <div className="space-y-4 border-t border-slate-200 dark:border-white/4 pt-4 text-xs">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Candidate Timeline History</h3>
                  {selectedCandidate.history.length === 0 ? (
                    <p className="text-slate-500 italic">Belum ada riwayat timeline.</p>
                  ) : (
                    <div className="space-y-4 pl-2 border-l border-slate-200 dark:border-white/8">
                      {selectedCandidate.history.map((h, i) => (
                        <div key={i} className="relative pl-4 space-y-1">
                          <div className="absolute left-[-21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white border border-[#0a0c14]" />
                          <span className="font-bold text-slate-700 dark:text-slate-300 block">{h.stage} ({h.status})</span>
                          <span className="text-[10px] text-slate-500 block">{new Date(h.createdAt).toLocaleString("id-ID")}</span>
                          {h.notes && <p className="text-[11px] text-slate-550 dark:text-slate-400 italic">"{h.notes}"</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="border-t border-slate-200 dark:border-white/4 pt-4 mt-6 flex items-center justify-between gap-3 bg-white dark:bg-[#0a0c14] relative z-20">
                {selectedCandidate.currentStage === "Offering" && selectedCandidate.status === "passed" ? (
                  <button
                    onClick={handleOpenMigrate}
                    className="px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 flex items-center gap-1.5 active:scale-[0.98] transition-all border border-slate-900 dark:border-white shadow-xs cursor-pointer"
                  >
                    Onboard Karyawan Baru <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div />
                )}
                
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Candidate Creation Form Modal */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setFormOpen(false)} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 shadow-2xl rounded-xl w-full max-w-md relative z-10 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4 mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Tambah Pelamar Kerja Baru</h3>
                <button onClick={() => setFormOpen(false)} className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">Nama Lengkap</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice Johnson" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">Alamat Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="alice@example.com" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">No. Telepon / HP</label>
                  <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxx" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                </div>

                <SearchSelect
                  label="Melamar Posisi Lowongan"
                  value={positionId}
                  onChange={setPositionId}
                  options={positions.map(p => ({ label: p.name, value: p._id }))}
                  placeholder="Pilih posisi..."
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/4 mt-6">
                  <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all">Batal</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5">
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Tambah Pelamar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Migration / Onboarding Form Modal */}
      <AnimatePresence>
        {migrateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setMigrateOpen(false)} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 shadow-2xl rounded-xl w-full max-w-md relative z-10 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4 mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Onboarding Karyawan Baru</h3>
                <button onClick={() => setMigrateOpen(false)} className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleMigrateSubmit} className="space-y-4 text-xs">
                <SearchSelect
                  label="Cabang Kantor Penempatan"
                  value={branchId}
                  onChange={setBranchId}
                  options={branches.map(b => ({ label: b.name, value: b._id }))}
                  placeholder="Pilih cabang..."
                />

                <SearchSelect
                  label="Divisi / Departemen"
                  value={divisionId}
                  onChange={setDivisionId}
                  options={divisions.map(d => ({ label: d.name, value: d._id }))}
                  placeholder="Pilih divisi..."
                />

                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">Tanggal Mulai Kontrak Kerja</label>
                  <input type="date" required value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/4 mt-6">
                  <button type="button" onClick={() => setMigrateOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all">Batal</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5">
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Migrasikan & Onboard
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pipeline Edit Modal */}
      <AnimatePresence>
        {pipelineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center font-sans p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setPipelineModalOpen(false)} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 shadow-2xl rounded-xl w-full max-w-md relative z-10 p-6 overflow-hidden flex flex-col gap-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Konfigurasi Alur Tahapan Rekrutmen</h3>
                <button onClick={() => setPipelineModalOpen(false)} className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Current Stages List */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 dark:text-slate-350">Tahapan Aktif (Urutan Alur):</label>
                <div className="space-y-1.5 border border-slate-200 dark:border-white/6 rounded-lg p-3 max-h-56 overflow-y-auto bg-slate-50 dark:bg-white/2">
                  {pipelineStages.map((st, idx) => (
                    <div key={st + idx} className="flex items-center justify-between p-2 rounded bg-white dark:bg-white/3 border border-slate-200 dark:border-white/4">
                      <span className="font-semibold text-slate-900 dark:text-slate-200">{idx + 1}. {st}</span>
                      <div className="flex items-center gap-1.5">
                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const updated = [...pipelineStages];
                            const temp = updated[idx];
                            updated[idx] = updated[idx - 1];
                            updated[idx - 1] = temp;
                            setPipelineStages(updated);
                          }}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer text-slate-550 dark:text-slate-400"
                        >
                          ▲
                        </button>
                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={idx === pipelineStages.length - 1}
                          onClick={() => {
                            const updated = [...pipelineStages];
                            const temp = updated[idx];
                            updated[idx] = updated[idx + 1];
                            updated[idx + 1] = temp;
                            setPipelineStages(updated);
                          }}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer text-slate-550 dark:text-slate-400"
                        >
                          ▼
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => {
                            setPipelineStages(pipelineStages.filter((_, i) => i !== idx));
                          }}
                          className="p-1 rounded text-red-500 hover:bg-red-550/10 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {pipelineStages.length === 0 && (
                    <p className="text-center py-4 text-slate-400 text-[10px]">Belum ada tahapan ditentukan</p>
                  )}
                </div>
              </div>

              {/* Add New Stage */}
              <div className="space-y-2 border-t border-slate-200 dark:border-white/4 pt-3">
                <label className="font-semibold text-slate-700 dark:text-slate-350">Tambah Tahapan Baru:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStageInput}
                    onChange={e => setNewStageInput(e.target.value)}
                    placeholder="Contoh: Tes Psikotes, BI Checking"
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newStageInput.trim();
                      if (trimmed && !pipelineStages.includes(trimmed)) {
                        setPipelineStages([...pipelineStages, trimmed]);
                        setNewStageInput("");
                      }
                    }}
                    className="px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/4 mt-2">
                <button type="button" onClick={() => setPipelineModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all">Batal</button>
                <button
                  type="button"
                  onClick={handleSavePipeline}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Alur
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
