"use client";

import React, { useState, useEffect } from "react";
import { 
  Package, Search, Plus, Edit, Loader2, ClipboardCheck, ArrowUpRight, 
  Trash2, ShieldAlert, X, UserPlus, CheckCircle, RefreshCcw 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchSelect from "@/components/SearchSelect";
import { generateCode39Svg } from "@/lib/barcode";
interface Employee {
  _id: string;
  name: string;
  NIK: string;
}

interface InventoryAsset {
  _id: string;
  code: string;
  name: string;
  category: string;
  condition: "good" | "damaged" | "lost";
  assignment?: {
    _id: string;
    employeeId?: {
      _id: string;
      name: string;
      NIK: string;
      divisionId?: { name: string };
      positionId?: { name: string };
    };
    handoverDate: string;
    signatureUrl?: string;
    status: "pending_handover" | "active" | "returned";
  };
}

export default function InventoryAdminPage() {
  const [assets, setAssets] = useState<InventoryAsset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<InventoryAsset | null>(null);
  const [signatureModalUrl, setSignatureModalUrl] = useState<string | null>(null);

  // Audit fields
  const [auditAsset, setAuditAsset] = useState<InventoryAsset | null>(null);
  const [auditCondition, setAuditCondition] = useState<"good" | "damaged" | "lost">("good");
  const [auditNotes, setAuditNotes] = useState("");
  const [scanInputCode, setScanInputCode] = useState("");
  const [scanError, setScanError] = useState("");

  // Form fields
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<string>("laptop");
  const [formCondition, setFormCondition] = useState<"good" | "damaged" | "lost">("good");
  const [assignEmployeeId, setAssignEmployeeId] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [categories, setCategories] = useState<string[]>(["laptop", "phone", "vehicle", "other"]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/v1/settings/categories");
      const data = await res.json();
      if (data.success && data.data) {
        setCategories(data.data);
        if (data.data.length > 0 && !selectedAsset) {
          setFormCategory(data.data[0]);
        }
      }
    } catch (err) {
      console.error("Gagal memuat kategori settings:", err);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/inventory");
      const data = await res.json();
      if (data.success) {
        setAssets(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat aset:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/v1/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat karyawan:", err);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
    fetchCategories();
  }, []);

  const handleOpenForm = (asset: InventoryAsset | null = null) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (asset) {
      setSelectedAsset(asset);
      setFormCode(asset.code);
      setFormName(asset.name);
      setFormCategory(asset.category);
      setFormCondition(asset.condition);
    } else {
      setSelectedAsset(null);
      setFormCode("");
      setFormName("");
      setFormCategory("laptop");
      setFormCondition("good");
    }
    setIsFormOpen(true);
  };

  const handleOpenAssign = (asset: InventoryAsset) => {
    setErrorMsg("");
    setSuccessMsg("");
    setSelectedAsset(asset);
    setAssignEmployeeId(asset.assignment?.employeeId?._id || "");
    setIsAssignOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/v1/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAsset?._id,
          code: formCode,
          name: formName,
          category: formCategory,
          condition: formCondition
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(selectedAsset ? "Aset berhasil diperbarui!" : "Aset baru berhasil ditambahkan!");
        fetchAssets();
        setTimeout(() => setIsFormOpen(false), 800);
      } else {
        setErrorMsg(data.message || "Gagal menyimpan data aset");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/v1/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAsset._id,
          employeeId: assignEmployeeId
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Aset berhasil ditugaskan!");
        fetchAssets();
        setTimeout(() => setIsAssignOpen(false), 800);
      } else {
        setErrorMsg(data.message || "Gagal menugaskan aset");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnAsset = async (asset: InventoryAsset) => {
    if (!confirm(`Konfirmasi pengembalian aset ${asset.name}?`)) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/v1/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset._id,
          action: "return"
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchAssets();
      } else {
        alert(data.message || "Gagal mengembalikan aset");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScanSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setScanError("");
    const code = scanInputCode.trim();
    if (!code) return;

    const found = assets.find(a => a.code.toLowerCase() === code.toLowerCase());
    if (found) {
      playBeep();
      setAuditAsset(found);
      setAuditCondition(found.condition);
      setScanError("");
    } else {
      setScanError(`Aset dengan kode "${code}" tidak terdaftar`);
      setAuditAsset(null);
    }
  };

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditAsset) return;
    setSubmitting(true);
    setScanError("");

    try {
      const res = await fetch("/api/v1/inventory/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: auditAsset._id,
          condition: auditCondition,
          notes: auditNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Laporan audit berhasil disimpan!");
        fetchAssets();
        setTimeout(() => {
          setIsAuditOpen(false);
          setAuditAsset(null);
          setAuditNotes("");
          setScanInputCode("");
          setSuccessMsg("");
        }, 1000);
      } else {
        setScanError(data.message || "Gagal menyimpan laporan audit");
      }
    } catch (err) {
      setScanError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter ? asset.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            Manajemen Inventaris & Aset GA
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            Kelola master inventaris kantor, serah terima BAST digital, dan pemantauan kepemilikan barang karyawan.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setScanInputCode("");
              setScanError("");
              setAuditAsset(null);
              setAuditNotes("");
              setIsAuditOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-xs font-semibold text-white cursor-pointer hover:bg-emerald-700 transition-all border border-emerald-600 shadow-xs"
          >
            <RefreshCcw className="w-4 h-4" />
            Pindai & Audit Fisik
          </button>
          <button
            onClick={() => handleOpenForm(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 transition-all border border-slate-900 dark:border-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Tambah Aset Baru
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 p-4 rounded-xl shadow-xs">
        <div>
          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">Cari Kode / Nama</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari MacBook, AST-LAP-001..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white text-xs placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">Saring Kategori</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white text-xs"
          >
            <option value="">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat} value={cat} className="capitalize">{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main List Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <Package className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Belum ada aset terdaftar</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/8 bg-slate-50/50 dark:bg-white/2 text-slate-700 dark:text-slate-400">
                <th className="p-4 font-semibold">Kode Aset</th>
                <th className="p-4 font-semibold">Nama Barang</th>
                <th className="p-4 font-semibold">Kategori</th>
                <th className="p-4 font-semibold">Kondisi</th>
                <th className="p-4 font-semibold">Pemegang Aktif</th>
                <th className="p-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => {
                const isAssigned = asset.assignment && (asset.assignment.status === "active" || asset.assignment.status === "pending_handover");
                return (
                  <tr key={asset._id} className="border-b border-slate-200 dark:border-white/4 hover:bg-slate-50/50 dark:hover:bg-white/1 transition-all">
                    <td className="p-4 font-mono font-semibold text-slate-800 dark:text-slate-300">
                      <div>{asset.code}</div>
                      <div 
                        className="h-5 w-28 mt-1 opacity-80"
                        dangerouslySetInnerHTML={{ __html: generateCode39Svg(asset.code).svg }}
                      />
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{asset.name}</td>
                    <td className="p-4 capitalize text-slate-700 dark:text-slate-300">{asset.category}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-sm font-semibold border ${
                        asset.condition === "good"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : asset.condition === "damaged"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                      }`}>
                        {asset.condition === "good" ? "Baik" : asset.condition === "damaged" ? "Rusak" : "Hilang"}
                      </span>
                    </td>
                    <td className="p-4">
                      {isAssigned ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900 dark:text-slate-200">
                            {asset.assignment?.employeeId?.name || "Karyawan"}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[9px] uppercase font-bold text-slate-550 dark:text-slate-400">
                            <span>{asset.assignment?.employeeId?.NIK}</span>
                            <span>&bull;</span>
                            <span className={`px-1.5 py-0.2 rounded border ${
                              asset.assignment?.status === "active" 
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" 
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 animate-pulse"
                            }`}>
                              {asset.assignment?.status === "active" ? "Aktif" : "Menunggu BAST"}
                            </span>
                            {asset.assignment?.signatureUrl && (
                              <button 
                                onClick={() => setSignatureModalUrl(asset.assignment?.signatureUrl || null)}
                                className="text-slate-800 dark:text-white underline hover:opacity-80 ml-1.5 cursor-pointer"
                              >
                                Lihat TTD
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">Belum Ditugaskan</span>
                      )}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenForm(asset)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/4 text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                        title="Edit Info Aset"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenAssign(asset)}
                        disabled={asset.condition === "lost"}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/4 text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all cursor-pointer disabled:opacity-30"
                        title="Tugaskan Aset"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      {isAssigned && (
                        <button
                          onClick={() => handleReturnAsset(asset)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/4 text-red-650 hover:text-red-500 transition-all cursor-pointer"
                          title="Kembalikan Aset (Return)"
                        >
                          <RefreshCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Asset Form Drawer Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg h-full bg-white dark:bg-[#0a0c14] border-l border-slate-200 dark:border-white/8 relative z-10 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/4 mb-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase">
                  {selectedAsset ? "Edit Detail Inventaris" : "Tambah Inventaris Aset Baru"}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveAsset} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-1.5">Kode Aset (Unique)</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    disabled={!!selectedAsset}
                    placeholder="AST-LAP-001, AST-MBL-012"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0e1017] border border-slate-250 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white text-xs disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-1.5">Nama Barang / Spesifikasi</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="MacBook Pro M2 16GB, Honda Vario B 1234 XYZ"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0e1017] border border-slate-250 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex-1 w-full">
                    <SearchSelect
                      label="Kategori Aset"
                      value={formCategory}
                      onChange={setFormCategory}
                      options={categories.map(cat => ({ label: cat.toUpperCase(), value: cat }))}
                      placeholder="Pilih kategori..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-1.5">Kondisi Aset</label>
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0e1017] border border-slate-250 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white text-xs"
                    >
                      <option value="good">Baik</option>
                      <option value="damaged">Rusak</option>
                      <option value="lost">Hilang</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-slate-200 dark:border-white/4 pt-4 mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-100 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAsset}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {selectedAsset ? "Simpan Perubahan" : "Tambah Aset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Asset Modal */}
      {isAssignOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 rounded-xl shadow-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">Tugaskan Aset Inventaris</h3>
              <button
                onClick={() => setIsAssignOpen(false)}
                className="p-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-white/2 rounded-lg border border-slate-200 dark:border-white/4 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-200">Aset: {selectedAsset.name}</div>
                <div className="text-[10px] text-slate-550 dark:text-slate-400">Kode: {selectedAsset.code} &bull; Kategori: {selectedAsset.category}</div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}

              <SearchSelect
                label="Pilih Karyawan Penerima"
                value={assignEmployeeId}
                onChange={setAssignEmployeeId}
                options={employees.map(emp => ({
                  label: `${emp.name} (${emp.NIK})`,
                  value: emp._id
                }))}
                placeholder="Pilih karyawan..."
              />
            </div>

            <div className="border-t border-slate-200 dark:border-white/4 pt-4 flex justify-end gap-3">
              <button
                onClick={() => setIsAssignOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-100 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleAssignAsset}
                disabled={submitting || !assignEmployeeId}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 border border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Tugaskan Aset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Viewer Modal */}
      {signatureModalUrl && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 rounded-xl shadow-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Tanda Tangan Serah Terima (BAST)</h3>
              <button
                onClick={() => setSignatureModalUrl(null)}
                className="p-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-6 flex justify-center">
              <div className="border border-slate-200 dark:border-white/8 rounded-lg bg-slate-50 p-2 overflow-hidden flex items-center justify-center">
                <img 
                  src={signatureModalUrl} 
                  alt="Tanda Tangan Digital BAST" 
                  className="max-h-48 object-contain scale-[1.05] dark:invert" 
                />
              </div>
            </div>
            <button
              onClick={() => setSignatureModalUrl(null)}
              className="w-full py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-100 cursor-pointer transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      {/* Monthly Physical Audit Scan Modal */}
      {isAuditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">Audit Fisik Bulanan Inventaris</h3>
              <button
                onClick={() => {
                  setIsAuditOpen(false);
                  setAuditAsset(null);
                }}
                className="p-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-550 dark:text-slate-400 hover:text-slate-250 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScanSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  required
                  value={scanInputCode}
                  onChange={(e) => setScanInputCode(e.target.value)}
                  placeholder="Scan barcode / Ketik kode aset..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all border border-slate-200 cursor-pointer"
              >
                Temukan
              </button>
            </form>

            {scanError && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Simulated Live Scanner Feed */}
            {!auditAsset && !successMsg && (
              <div className="relative border border-slate-200 dark:border-white/8 rounded-lg overflow-hidden h-40 bg-slate-900 flex flex-col items-center justify-center text-white/60">
                <div className="absolute inset-x-0 h-[2px] bg-red-500 top-1/2 -translate-y-1/2 animate-[pulse_1.5s_infinite] shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <div className="border border-emerald-500/50 w-64 h-24 rounded flex items-center justify-center border-dashed relative">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-500" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-500" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-500" />
                  <span className="text-[9px] uppercase tracking-widest font-mono text-emerald-400">Menunggu Barcode...</span>
                </div>
                <span className="text-[9px] text-slate-400 mt-2 font-sans text-center px-4">Gunakan scanner barcode USB/wireless atau ketikkan kode di atas</span>
              </div>
            )}

            {/* Audit Form when asset is detected */}
            {auditAsset && (
              <form onSubmit={handleSaveAudit} className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-white/2 rounded-lg border border-slate-200 dark:border-white/4 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-slate-250">Aset: {auditAsset.name}</div>
                  <div className="text-[10px] text-slate-550 dark:text-slate-400">Kode: {auditAsset.code} &bull; Kategori: {auditAsset.category}</div>
                  <div className="text-[10px] text-slate-550 dark:text-slate-400">Kondisi Saat Ini: <span className="capitalize font-semibold">{auditAsset.condition}</span></div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-1.5">Kondisi Hasil Pemeriksaan</label>
                  <select
                    value={auditCondition}
                    onChange={(e) => setAuditCondition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                  >
                    <option value="good">Baik</option>
                    <option value="damaged">Rusak</option>
                    <option value="lost">Hilang</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-1.5">Catatan Pemeriksa (Auditor)</label>
                  <textarea
                    rows={3}
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="Contoh: Layar lecet ringan, adaptor hilang..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                  />
                </div>

                <div className="border-t border-slate-200 dark:border-white/4 pt-4 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setAuditAsset(null)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Reset Pindai
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Simpan Laporan Audit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
