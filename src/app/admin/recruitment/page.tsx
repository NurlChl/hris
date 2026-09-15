"use client";

import React, { useCallback, useEffect, useState } from "react";
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

/**
 * A selection pipeline for one position. `positionId` comes back populated on
 * some responses and as a bare id on others, so both forms are matched when
 * looking a pipeline up.
 */
interface Pipeline {
  _id: string;
  positionId: { _id: string; name: string } | string | null;
  stages: string[];
}

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState<"candidates" | "jobs">("candidates");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pipelines state
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
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

  const fetchCandidates = useCallback(async () => {
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
  }, []);

  const fetchPipelines = useCallback(async () => {
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
  }, []);

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

  const fetchMetadata = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void fetchMetadata();
    if (activeTab === "candidates") {
      void fetchCandidates();
    } else {
      void fetchPipelines();
    }
  }, [activeTab, fetchMetadata, fetchCandidates, fetchPipelines]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground dark:text-foreground">Recruitment & ATS Pipeline</h1>
          <p className="text-xs text-muted dark:text-muted mt-1">Pantau pipeline pelamar kerja, jadwalkan tes, dan migrasikan pelamar yang lulus menjadi karyawan baru</p>
        </div>
        {activeTab === "candidates" && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-xs font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 active:scale-[0.98] transition-all w-fit"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Pelamar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface-2 border border-line rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("candidates")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "candidates" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground" }`}
        >
          <Users className="w-3.5 h-3.5" />
          Kandidat Pelamar
        </button>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "jobs" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground" }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Kelola Lowongan (Loker)
        </button>
      </div>

      {activeTab === "candidates" ? (
        <>
          <div className="flex items-center relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari pelamar, lowongan..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface border border-line text-xs text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted"
            />
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted dark:text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="h-48 border border-dashed border-line rounded-xl flex flex-col items-center justify-center text-center p-6 text-muted">
              <Users className="w-8 h-8 mb-2 opacity-50 text-muted" />
              <p className="text-sm font-medium">Pelamar tidak ditemukan</p>
              <p className="text-xs mt-1">Belum ada pelamar baru atau sesuaikan kata kunci pencarian.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
  
          {DEFAULT_STAGES.map(stage => {
            const list = filteredCandidates.filter(c => c.currentStage === stage);
            return (
              <div key={stage} className="bg-surface border border-line/60 dark:border-white/6 rounded-xl p-4 flex flex-col gap-3 min-h-[300px]">
                <div className="flex items-center justify-between border-b border-line pb-2 mb-1">
                  <h3 className="text-xs font-semibold text-foreground">{stage}</h3>
                  <span className="px-1.5 py-0.5 rounded bg-white/4 text-[11px] font-semibold text-muted dark:text-muted">{list.length}</span>
                </div>

                <div className="flex-1 space-y-3">
                  {list.map(c => (
                    <div
                      key={c._id}
                      onClick={() => handleOpenDetails(c)}
                      className="p-3 bg-white border border-line rounded-lg hover:border-white/12 hover:bg-surface transition-all duration-200 cursor-pointer text-left space-y-2 group"
                    >
                      <div>
                        <span className="font-semibold text-xs text-foreground dark:text-foreground group-hover:text-foreground dark:group-hover:text-white transition-all block">{c.name}</span>
                        <span className="text-xs text-muted font-medium">{c.positionId?.name || "Posisi Lain"}</span>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="capitalize text-muted font-mono">Src: {c.source.replace(/_/g, " ")}</span>
                        <span className={`px-1 rounded font-semibold capitalize ${
                          c.status === "passed"
                            ? "bg-success-soft text-success dark:text-success"
                            : c.status === "rejected"
                            ? "bg-danger-soft text-danger dark:text-danger"
                            : "bg-warning-soft text-warning dark:text-warning"
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
          <div className="h-64 flex items-center justify-center text-muted dark:text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          </div>
        ) : positions.length === 0 ? (
          <div className="h-48 border border-dashed border-line rounded-xl flex flex-col items-center justify-center text-center p-6 text-muted">
            <Briefcase className="w-8 h-8 mb-2 opacity-50 text-muted" />
            <p className="text-sm font-medium">Jabatan tidak ditemukan</p>
            <p className="text-xs mt-1">Buat jabatan/posisi terlebih dahulu di menu divisi & jabatan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positions.map(pos => {
              const pipe = pipelines.find((p) =>
                typeof p.positionId === "object" && p.positionId !== null
                  ? p.positionId._id === pos._id
                  : p.positionId === pos._id
              );
              const stages = pipe?.stages || DEFAULT_STAGES;

              return (
                <div key={pos._id} className="p-5 bg-surface border border-line/60 dark:border-white/6 rounded-xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-foreground dark:text-foreground">{pos.name}</h3>
                    <div className="flex flex-wrap gap-1.5 items-center text-xs text-muted dark:text-muted">
                      <span className="font-semibold text-foreground dark:text-muted">Tahapan:</span>
                      {stages.map((st: string, idx: number) => (
                        <span key={st} className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-surface-2 dark:bg-white/4 text-foreground dark:text-muted font-semibold text-[11px]">{st}</span>
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
                    className="w-fit px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-surface-2 dark:hover:bg-surface-2 rounded-lg cursor-pointer transition-all border border-line"
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
              className="w-full max-w-lg h-full bg-surface border-l border-line shadow-[var(--shadow-pop)] relative z-10 p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground dark:text-foreground">Detail & Evaluasi Pelamar</h2>
                    <p className="text-xs text-muted dark:text-muted mt-1">Update tahapan evaluasi rekrutmen kandidat secara berkala</p>
                  </div>
                  <button onClick={() => setDetailsOpen(false)} className="p-1 rounded bg-surface border border-line text-muted dark:text-muted hover:text-foreground cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-danger text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Candidate Info */}
                <div className="p-4 rounded-xl bg-white/1 border border-line space-y-2 text-xs">
                  <p className="font-semibold text-foreground dark:text-foreground text-sm">{selectedCandidate.name}</p>
                  <p className="text-muted dark:text-muted">Email: {selectedCandidate.email}</p>
                  <p className="text-muted dark:text-muted">No. HP: {selectedCandidate.phone}</p>
                  <p className="text-muted dark:text-muted font-semibold">Lamaran Lowongan: {selectedCandidate.positionId?.name || "-"}</p>
                  {selectedCandidate.cvUrl && (
                    <a href={selectedCandidate.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-foreground hover:text-foreground underline font-medium mt-1">
                      <FileText className="w-3.5 h-3.5" /> Lihat Berkas CV <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Evaluator Update Form */}
                <div className="space-y-4 text-xs border-t border-line pt-4">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Update Evaluasi Tahapan</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-muted dark:text-muted font-semibold">Tentukan Tahap</label>
                      <select value={actionStage} onChange={e => setActionStage(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface-2 dark:bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs">
                        {DEFAULT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-muted dark:text-muted font-semibold">Status Tahap</label>
                      <select value={actionStatus} onChange={e => setActionStatus(e.target.value as "pending" | "in_progress" | "passed" | "rejected" | "on_hold")} className="w-full px-3 py-2 rounded-lg bg-surface-2 dark:bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs">
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
                      <label className="text-muted dark:text-muted font-semibold">Negosiasi Gaji Offering (Rupiah)</label>
                      <input type="number" value={offeringSalary} onChange={e => setOfferingSalary(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-muted dark:text-muted font-semibold">Catatan Evaluasi / Interview</label>
                    <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} placeholder="Tulis hasil wawancara, catatan skor psikotes, dll..." rows={3} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs placeholder:text-muted" />
                  </div>

                  <button onClick={handleUpdateStage} disabled={submitting} className="px-4 py-2 rounded-lg bg-surface border border-line text-xs font-semibold text-foreground hover:text-foreground hover:bg-white/4 cursor-pointer transition-all flex items-center gap-1.5 w-fit">
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Simpan Evaluasi
                  </button>
                </div>

                {/* Candidate History / Timeline */}
                <div className="space-y-4 border-t border-line pt-4 text-xs">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Candidate Timeline History</h3>
                  {selectedCandidate.history.length === 0 ? (
                    <p className="text-muted italic">Belum ada riwayat timeline.</p>
                  ) : (
                    <div className="space-y-4 pl-2 border-l border-line">
                      {selectedCandidate.history.map((h, i) => (
                        <div key={i} className="relative pl-4 space-y-1">
                          <div className="absolute left-[-21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border border-line" />
                          <span className="font-semibold text-foreground block">{h.stage} ({h.status})</span>
                          <span className="text-xs text-muted block">{new Date(h.createdAt).toLocaleString("id-ID")}</span>
                          {h.notes && (
                            <p className="text-xs text-muted dark:text-muted italic">
                              &ldquo;{h.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="border-t border-line pt-4 mt-6 flex items-center justify-between gap-3 bg-surface relative z-20">
                {selectedCandidate.currentStage === "Offering" && selectedCandidate.status === "passed" ? (
                  <button
                    onClick={handleOpenMigrate}
                    className="px-4 py-2.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-surface-2 dark:hover:bg-surface-2 flex items-center gap-1.5 active:scale-[0.98] transition-all border border-line-strong dark:border-white cursor-pointer"
                  >
                    Onboard Karyawan Baru <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div />
                )}
                
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-muted dark:text-muted hover:text-foreground transition-all cursor-pointer"
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
              className="bg-surface border border-line shadow-[var(--shadow-pop)] rounded-xl w-full max-w-md relative z-10 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                <h3 className="text-sm font-semibold text-foreground dark:text-foreground">Tambah Pelamar Kerja Baru</h3>
                <button onClick={() => setFormOpen(false)} className="p-1 rounded bg-surface border border-line text-muted dark:text-muted hover:text-foreground cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-danger text-xs flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-foreground font-semibold">Nama Lengkap</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice Johnson" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                </div>

                <div className="space-y-1">
                  <label className="text-foreground font-semibold">Alamat Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="alice@example.com" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                </div>

                <div className="space-y-1">
                  <label className="text-foreground font-semibold">No. Telepon / HP</label>
                  <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxx" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                </div>

                <SearchSelect
                  label="Melamar Posisi Lowongan"
                  value={positionId}
                  onChange={setPositionId}
                  options={positions.map(p => ({ label: p.name, value: p._id }))}
                  placeholder="Pilih posisi..."
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-6">
                  <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-muted dark:text-muted hover:text-foreground transition-all">Batal</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-xs font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5">
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
              className="bg-surface border border-line shadow-[var(--shadow-pop)] rounded-xl w-full max-w-md relative z-10 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                <h3 className="text-sm font-semibold text-foreground dark:text-foreground">Onboarding Karyawan Baru</h3>
                <button onClick={() => setMigrateOpen(false)} className="p-1 rounded bg-surface border border-line text-muted dark:text-muted hover:text-foreground cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-danger text-xs flex items-center gap-2 mb-4">
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
                  <label className="text-foreground font-semibold">Tanggal Mulai Kontrak Kerja</label>
                  <input type="date" required value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-6">
                  <button type="button" onClick={() => setMigrateOpen(false)} className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-muted dark:text-muted hover:text-foreground transition-all">Batal</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-xs font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5">
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
              className="bg-surface border border-line shadow-[var(--shadow-pop)] rounded-xl w-full max-w-md relative z-10 p-6 overflow-hidden flex flex-col gap-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-sm font-semibold text-foreground dark:text-foreground">Konfigurasi Alur Tahapan Rekrutmen</h3>
                <button onClick={() => setPipelineModalOpen(false)} className="p-1 rounded bg-surface border border-line text-muted dark:text-muted hover:text-foreground cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-danger flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Current Stages List */}
              <div className="space-y-2">
                <label className="font-semibold text-foreground dark:text-muted">Tahapan Aktif (Urutan Alur):</label>
                <div className="space-y-1.5 border border-line dark:border-white/6 rounded-lg p-3 max-h-56 overflow-y-auto bg-surface-2">
                  {pipelineStages.map((st, idx) => (
                    <div key={st + idx} className="flex items-center justify-between p-2 rounded bg-surface border border-line">
                      <span className="font-semibold text-foreground dark:text-foreground">{idx + 1}. {st}</span>
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
                          className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 cursor-pointer text-muted dark:text-muted"
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
                          className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 cursor-pointer text-muted dark:text-muted"
                        >
                          ▼
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => {
                            setPipelineStages(pipelineStages.filter((_, i) => i !== idx));
                          }}
                          className="p-1 rounded text-danger hover:bg-danger-soft cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {pipelineStages.length === 0 && (
                    <p className="text-center py-4 text-subtle text-[11px]">Belum ada tahapan ditentukan</p>
                  )}
                </div>
              </div>

              {/* Add New Stage */}
              <div className="space-y-2 border-t border-line pt-3">
                <label className="font-semibold text-foreground dark:text-muted">Tambah Tahapan Baru:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStageInput}
                    onChange={e => setNewStageInput(e.target.value)}
                    placeholder="Contoh: Tes Psikotes, BI Checking"
                    className="flex-1 px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
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
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-surface-2 dark:hover:bg-surface-2 cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-2">
                <button type="button" onClick={() => setPipelineModalOpen(false)} className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-muted dark:text-muted hover:text-foreground transition-all">Batal</button>
                <button
                  type="button"
                  onClick={handleSavePipeline}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-xs font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
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
