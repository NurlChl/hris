"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Building2, 
  MapPin, 
  Clock, 
  Trash2, 
  Edit, 
  Plus, 
  X, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Dynamic import of Leaflet map component to prevent SSR window reference error
const BranchMap = dynamic(() => import("@/components/BranchMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-slate-950 border border-slate-200 dark:border-white/8 rounded-lg animate-pulse flex items-center justify-center text-xs text-slate-500">
      Memuat Peta Interaktif...
    </div>
  ),
});

interface Branch {
  _id?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radiusMeter: number;
  workHours: {
    start: string;
    end: string;
  };
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form states
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(-6.200000); // Default Jakarta coordinates
  const [lng, setLng] = useState(106.816666);
  const [radiusMeter, setRadiusMeter] = useState(15);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/branches");
      const data = await res.json();
      if (data.success) {
        setBranches(data.data);
      }
    } catch (err) {
      console.error("Gagal memuat cabang:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (branch?: Branch) => {
    if (branch) {
      setSelectedBranchId(branch._id || null);
      setName(branch.name);
      setAddress(branch.address);
      setLat(branch.lat);
      setLng(branch.lng);
      setRadiusMeter(branch.radiusMeter);
      setStartTime(branch.workHours.start);
      setEndTime(branch.workHours.end);
    } else {
      setSelectedBranchId(null);
      setName("");
      setAddress("");
      setLat(-6.200000);
      setLng(106.816666);
      setRadiusMeter(15);
      setStartTime("09:00");
      setEndTime("17:00");
    }
    setErrorMessage("");
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/v1/branches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedBranchId,
          name,
          address,
          lat,
          lng,
          radiusMeter,
          workHours: {
            start: startTime,
            end: endTime,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchBranches();
        setFormOpen(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal menyimpan cabang");
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan koneksi server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus cabang kantor ini?")) return;

    try {
      const response = await fetch(`/api/v1/branches/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        fetchBranches();
      }
    } catch (err) {
      console.error("Gagal menghapus cabang:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Master Data Cabang Kantor</h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Konfigurasi lokasi penempatan cabang kantor dan area geofence absensi</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-sm font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Cabang
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-550 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
        </div>
      ) : branches.length === 0 ? (
        <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <Building2 className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Belum ada cabang terdaftar</p>
          <p className="text-xs mt-1">Tambahkan cabang kantor baru untuk memulai penempatan lokasi absensi karyawan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={branch._id}
              className="bg-white border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl p-5 hover:border-white/12 hover:bg-white dark:bg-white/3 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-750 dark:text-slate-300 border border-slate-200 dark:border-white/8 font-semibold text-[10px]">
                      Radius: {branch.radiusMeter}m
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{branch.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenForm(branch)}
                      className="p-1.5 rounded hover:bg-white/4 text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBranch(branch._id!)}
                      className="p-1.5 rounded hover:bg-red-500/5 text-slate-550 dark:text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-slate-300">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Operasional: {branch.workHours.start} - {branch.workHours.end} WIB</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/4 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Koordinat: {branch.lat.toFixed(6)}, {branch.lng.toFixed(6)}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Slide-over Form Panel */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseForm}
              className="absolute inset-0 bg-black"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg h-full bg-white dark:bg-[#0a0c14] border-l border-slate-200/60 dark:border-white/8 shadow-2xl relative z-10 p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-200">
                    {selectedBranchId ? "Edit Cabang Kantor" : "Tambah Cabang Kantor Baru"}
                  </h2>
                  <button
                    onClick={handleCloseForm}
                    className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form id="branch-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">Nama Cabang</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kantor Pusat Jakarta"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">Alamat Kantor</label>
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Jl. Sudirman No. 12, Jakarta Selatan"
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold">Jam Masuk Operasional</label>
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold">Jam Pulang Operasional</label>
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">Radius Area Absen (Meter)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={1000}
                      value={radiusMeter}
                      onChange={(e) => setRadiusMeter(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs"
                    />
                  </div>

                  {/* Interaktive Leaflet Map */}
                  <BranchMap
                    lat={lat}
                    lng={lng}
                    radius={radiusMeter}
                    onChange={(nLat, nLng) => {
                      setLat(nLat);
                      setLng(nLng);
                    }}
                  />
                </form>
              </div>

              <div className="border-t border-slate-200 dark:border-white/4 pt-4 mt-6 flex items-center justify-end gap-3 bg-white dark:bg-[#0a0c14] relative z-20">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-slate-200 hover:bg-white dark:bg-white/2 cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="branch-form"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Cabang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
