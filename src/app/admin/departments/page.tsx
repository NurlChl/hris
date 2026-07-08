"use client";

import React, { useState, useEffect } from "react";
import { ClipboardList, Briefcase, Plus, Trash2, Edit, X, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchSelect from "@/components/SearchSelect";

interface MasterItem {
  _id: string;
  name: string;
  headId?: { _id: string; name: string } | any;
  divisionId?: { _id: string; name: string } | any;
  branchId?: { _id: string; name: string } | any;
  description?: string;
  jobdesk?: string;
  requirements?: string;
  location?: string;
  type?: string;
  status?: "active" | "inactive";
}

export default function DepartmentsPage() {
  const [activeTab, setActiveTab] = useState<"division" | "position">("division");
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Data lists
  const [employees, setEmployees] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [headId, setHeadId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [divisionBranchId, setDivisionBranchId] = useState("");
  
  // Vacancy detail states
  const [description, setDescription] = useState("");
  const [jobdesk, setJobdesk] = useState("");
  const [requirements, setRequirements] = useState("");
  const [location, setLocation] = useState("Jakarta");
  const [type, setType] = useState("Full-Time");
  const [status, setStatus] = useState("active");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/v1/employees");
      const data = await res.json();
      if (data.success) setEmployees(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranchesList = async () => {
    try {
      const res = await fetch("/api/v1/branches");
      const data = await res.json();
      if (data.success) setBranches(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDivisionsList = async () => {
    try {
      const res = await fetch("/api/v1/divisions");
      const data = await res.json();
      if (data.success) setDivisions(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    setItems([]);
    try {
      const endpoint = activeTab === "division" ? "/api/v1/divisions" : "/api/v1/positions";
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (err) {
      console.error("Gagal memuat data master:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchEmployees();
    fetchDivisionsList();
    fetchBranchesList();
  }, [activeTab]);

  const handleOpenForm = (item?: MasterItem) => {
    if (item) {
      setSelectedId(item._id);
      setName(item.name);
      setHeadId(item.headId?._id || item.headId || "");
      setDivisionId(item.divisionId?._id || item.divisionId || "");
      setDivisionBranchId(item.branchId?._id || item.branchId || "");
      setDescription(item.description || "");
      setJobdesk(item.jobdesk || "");
      setRequirements(item.requirements || "");
      setLocation(item.location || "Jakarta");
      setType(item.type || "Full-Time");
      setStatus(item.status || "active");
    } else {
      setSelectedId(null);
      setName("");
      setHeadId("");
      setDivisionId(divisions[0]?._id || "");
      setDivisionBranchId(branches[0]?._id || "");
      setDescription("");
      setJobdesk("");
      setRequirements("");
      setLocation("Jakarta");
      setType("Full-Time");
      setStatus("active");
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

    const endpoint = activeTab === "division" ? "/api/v1/divisions" : "/api/v1/positions";
    const payload = activeTab === "division"
      ? { id: selectedId, name, headId: headId || null, branchId: divisionBranchId || null }
      : { 
          id: selectedId, 
          name, 
          divisionId: divisionId || null,
          description,
          jobdesk,
          requirements,
          location,
          type,
          status
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        fetchItems();
        setFormOpen(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal menyimpan data");
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan koneksi server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const label = activeTab === "division" ? "divisi" : "jabatan";
    if (!confirm(`Apakah Anda yakin ingin menghapus ${label} ini?`)) return;

    const endpoint = activeTab === "division" ? `/api/v1/divisions/${id}` : `/api/v1/positions/${id}`;

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        fetchItems();
      }
    } catch (err) {
      console.error("Gagal menghapus item:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Divisi & Jabatan</h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Kelola departemen divisi kerja dan penamaan jenjang jabatan karyawan</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-sm font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah {activeTab === "division" ? "Divisi" : "Jabatan"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/8 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("division")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "division" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-slate-500 dark:text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Divisi / Departemen
        </button>
        <button
          onClick={() => setActiveTab("position")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "position" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-slate-500 dark:text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Jabatan Kerja
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-550 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
        </div>
      ) : items.length === 0 ? (
        <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
          {activeTab === "division" ? <ClipboardList className="w-8 h-8 mb-2 opacity-50" /> : <Briefcase className="w-8 h-8 mb-2 opacity-50" />}
          <p className="text-sm font-medium">Belum ada {activeTab === "division" ? "divisi" : "jabatan"} terdaftar</p>
          <p className="text-xs mt-1">Tambahkan data master baru untuk melengkapi data jabatan operasional karyawan.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/2 text-slate-550 dark:text-slate-400">
                <th className="p-4 font-semibold">Nama {activeTab === "division" ? "Divisi / Departemen" : "Jabatan Kerja"}</th>
                {activeTab === "division" ? (
                  <>
                    <th className="p-4 font-semibold">Cabang</th>
                    <th className="p-4 font-semibold">Ketua Divisi</th>
                  </>
                ) : (
                  <th className="p-4 font-semibold">Divisi Terkait</th>
                )}
                <th className="p-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item._id} className="border-b border-slate-200 dark:border-white/4 hover:bg-slate-50/50 dark:hover:bg-white/1 transition-all">
                  <td className="p-4 font-semibold text-slate-900 dark:text-slate-200 text-sm">{item.name}</td>
                  {activeTab === "division" ? (
                    <>
                      <td className="p-4 text-slate-550 dark:text-slate-400 font-medium">
                        {item.branchId?.name || "-"}
                      </td>
                      <td className="p-4 text-slate-550 dark:text-slate-400 font-medium">
                        {item.headId?.name ? `${item.headId.name} (${item.headId.employeeId})` : "-"}
                      </td>
                    </>
                  ) : (
                    <td className="p-4 text-slate-550 dark:text-slate-400 font-medium">
                      {item.divisionId?.name || "-"}
                    </td>
                  )}
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenForm(item)}
                      className="p-1.5 rounded hover:bg-white/4 text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item._id)}
                      className="p-1.5 rounded hover:bg-red-500/5 text-slate-550 dark:text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Overlay Form Modal */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseForm}
              className="absolute inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0a0c14] border border-slate-200/60 dark:border-white/8 shadow-2xl rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative z-10 p-6"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4 mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-200">
                  {selectedId ? `Edit ${activeTab === "division" ? "Divisi" : "Jabatan"}` : `Tambah ${activeTab === "division" ? "Divisi" : "Jabatan"} Baru`}
                </h3>
                <button
                  onClick={handleCloseForm}
                  className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">Nama {activeTab === "division" ? "Divisi" : "Jabatan"}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={activeTab === "division" ? "e.g. Finance & Accounting" : "e.g. Senior Software Engineer"}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 text-xs"
                  />
                </div>

                {activeTab === "division" ? (
                  <>
                    <SearchSelect
                      label="Hubungkan ke Cabang Kantor"
                      value={divisionBranchId}
                      onChange={setDivisionBranchId}
                      options={branches.map((b) => ({
                        label: b.name,
                        value: b._id,
                      }))}
                      placeholder="Pilih Cabang Kantor..."
                    />

                    <SearchSelect
                      label="Ketua / Manager Divisi"
                      value={headId}
                      onChange={setHeadId}
                      options={employees.map((emp) => ({
                        label: `${emp.name} (${emp.employeeId})`,
                        value: emp._id,
                      }))}
                      placeholder="Pilih Ketua Divisi (Opsional)..."
                    />
                  </>
                ) : (
                  <>
                    <SearchSelect
                      label="Hubungkan ke Divisi"
                      value={divisionId}
                      onChange={setDivisionId}
                      options={divisions.map((div) => ({
                        label: div.name,
                        value: div._id,
                      }))}
                      placeholder="Pilih Divisi Kerja..."
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-700 dark:text-slate-300 font-semibold">Tipe Pekerjaan</label>
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                        >
                          <option value="Full-Time">Full-Time</option>
                          <option value="Part-Time">Part-Time</option>
                          <option value="Contract">Contract</option>
                          <option value="Internship">Internship</option>
                          <option value="Freelance">Freelance</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-700 dark:text-slate-300 font-semibold">Status Lowongan Loker</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                        >
                          <option value="active">Aktif (Buka Lowongan)</option>
                          <option value="inactive">Nonaktif (Tutup Lowongan)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold">Lokasi Penempatan Kerja</label>
                      <input
                        type="text"
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Jakarta, Remote, Hybrid"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold">Deskripsi Lowongan</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Deskripsikan penawaran/informasi umum mengenai lowongan ini..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 text-xs resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold">Tanggung Jawab Pekerjaan (Jobdesk)</label>
                      <textarea
                        value={jobdesk}
                        onChange={(e) => setJobdesk(e.target.value)}
                        placeholder="Sebutkan tanggung jawab pekerjaan (satu per baris)..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 text-xs resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold">Kebutuhan / Persyaratan (Requirements)</label>
                      <textarea
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        placeholder="Sebutkan persyaratan pelamar (satu per baris)..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 text-xs resize-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/4 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-slate-200 hover:bg-white dark:bg-white/2 cursor-pointer transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Simpan
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
