"use client";

import React, { useState, useEffect } from "react";
import { 
  History, Search, Loader2, Calendar, ShieldAlert, ChevronLeft, ChevronRight, Download, Eye, X 
} from "lucide-react";

interface AuditLogEntry {
  _id: string;
  userId: string;
  action: string;
  module: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  ip: string;
  userAgent: string;
  timestamp: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogsPage() {
  const [activeTab, setActiveTab] = useState<"system" | "physical">("system");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Physical Audit Reports State
  const [physicalReports, setPhysicalReports] = useState<any[]>([]);
  const [fetchingReports, setFetchingReports] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        module: moduleFilter,
        action: actionFilter
      });
      const res = await fetch(`/api/v1/audit?${queryParams}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.meta.totalPages);
      }
    } catch (err) {
      console.error("Gagal memuat log audit:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhysicalReports = async () => {
    setFetchingReports(true);
    try {
      const res = await fetch("/api/v1/inventory/audit");
      const data = await res.json();
      if (data.success) {
        setPhysicalReports(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat laporan audit fisik:", err);
    } finally {
      setFetchingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === "system") {
      fetchLogs();
    } else {
      fetchPhysicalReports();
    }
  }, [page, moduleFilter, actionFilter, activeTab]);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ["Waktu", "User", "Email", "Role", "Modul", "Aksi", "IP Address", "User Agent"];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString("id-ID"),
      log.user.name,
      log.user.email,
      log.user.role,
      log.module,
      log.action,
      log.ip,
      log.userAgent.replace(/"/g, '""')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            Aktivitas & Laporan Audit
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            Pantau dan audit seluruh rekam jejak aktivitas operasional serta laporan hasil audit fisik inventaris bulanan.
          </p>
        </div>
        {activeTab === "system" && (
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-xs font-semibold text-white dark:text-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 transition-all border border-slate-900 dark:border-white shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/2 border border-slate-200 dark:border-white/8 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("system")}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "system" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-250" }`}
        >
          Aktivitas Sistem (Log)
        </button>
        <button
          onClick={() => setActiveTab("physical")}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${ activeTab === "physical" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-250" }`}
        >
          Riwayat Audit Fisik Bulanan
        </button>
      </div>

      {activeTab === "system" ? (
        <>
          {/* Filter Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 p-4 rounded-xl shadow-xs">
        <div>
          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">Saring Modul</label>
          <select
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white text-xs"
          >
            <option value="">Semua Modul</option>
            <option value="attendance">Presensi & Cabang</option>
            <option value="leave">Izin & Cuti</option>
            <option value="payroll">Gaji & Payroll</option>
            <option value="recruitment">Rekrutmen ATS</option>
            <option value="settings">Konfigurasi & Settings</option>
            <option value="inventory">Inventaris Aset</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">Saring Aksi</label>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            placeholder="Cari aksi (misal: CREATE_BRANCH, SIGN_BAST...)"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white text-xs placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
        </div>
      ) : logs.length === 0 ? (
        <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <ShieldAlert className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Belum ada catatan log aktivitas audit</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/8 bg-slate-50/50 dark:bg-white/2 text-slate-700 dark:text-slate-400">
                <th className="p-4 font-semibold">Waktu</th>
                <th className="p-4 font-semibold">Pengguna</th>
                <th className="p-4 font-semibold">Modul</th>
                <th className="p-4 font-semibold">Aksi</th>
                <th className="p-4 font-semibold">IP Address</th>
                <th className="p-4 font-semibold text-right">Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-slate-200 dark:border-white/4 hover:bg-slate-50/50 dark:hover:bg-white/1 transition-all">
                  <td className="p-4 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                    {new Date(log.timestamp).toLocaleString("id-ID")}
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-200">{log.user.name}</div>
                    <div className="text-[10px] text-slate-500">{log.user.email} &bull; {log.user.role}</div>
                  </td>
                  <td className="p-4 capitalize text-slate-700 dark:text-slate-300">{log.module}</td>
                  <td className="p-4">
                    <span className="px-1.5 py-0.5 rounded-sm font-mono text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-800 dark:text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-[10px]">{log.ip}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/4 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-white/8 text-xs text-slate-550 bg-slate-50/50 dark:bg-white/2">
            <span>Halaman {page} dari {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-slate-200 dark:border-white/8 hover:bg-white dark:hover:bg-white/4 cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-slate-200 dark:border-white/8 hover:bg-white dark:hover:bg-white/4 cursor-pointer disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <div className="space-y-4">
          {fetchingReports ? (
            <div className="h-64 flex items-center justify-center text-slate-550 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
            </div>
          ) : physicalReports.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <History className="w-8 h-8 mb-2 opacity-50 text-slate-600" />
              <p className="text-sm font-medium">Belum ada laporan audit fisik</p>
              <p className="text-xs mt-1">Lakukan pemeriksaan fisik aset inventaris di menu Manajemen Inventaris.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/8 bg-slate-50/50 dark:bg-white/2 text-slate-700 dark:text-slate-400">
                    <th className="p-4 font-semibold">Tanggal Audit</th>
                    <th className="p-4 font-semibold">Kode Aset</th>
                    <th className="p-4 font-semibold">Nama Barang</th>
                    <th className="p-4 font-semibold">Kondisi Hasil Audit</th>
                    <th className="p-4 font-semibold">Pemeriksa (Auditor)</th>
                    <th className="p-4 font-semibold">Catatan Audit</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {physicalReports.map((report) => (
                    <tr key={report._id} className="border-b border-slate-200 dark:border-white/4 hover:bg-slate-50/50 dark:hover:bg-white/1 transition-all">
                      <td className="p-4 text-slate-550 dark:text-slate-400">
                        {new Date(report.auditDate || report.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-800 dark:text-slate-350">{report.inventoryId?.code || "-"}</td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{report.inventoryId?.name || "Aset Telah Dihapus"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-bold capitalize text-[10px] ${
                          report.condition === "good"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : report.condition === "damaged"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "bg-red-500/10 text-red-700 dark:text-red-400"
                        }`}>
                          {report.condition === "good" ? "Baik" : report.condition === "damaged" ? "Rusak" : "Hilang"}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{report.auditorId?.name || "System"}</td>
                      <td className="p-4 text-slate-550 dark:text-slate-400 italic">{report.notes || "-"}</td>
                      <td className="p-4">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-550 dark:text-slate-400 font-semibold text-[9px] uppercase tracking-wider">
                          {report.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail JSON Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 rounded-xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">Detail Log Perubahan Data</h3>
                <p className="text-[10px] text-slate-550 mt-0.5">Aksi: {selectedLog.action} &bull; Modul: {selectedLog.module}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 hover:bg-slate-200 dark:hover:bg-white/8 text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-[10px] uppercase text-slate-700 dark:text-slate-400 mb-1.5">Data Sebelum Perubahan (Before)</h4>
                  <pre className="p-3 bg-slate-50 dark:bg-white/2 border border-slate-200/65 dark:border-white/6 rounded-lg text-[10px] font-mono overflow-x-auto text-slate-800 dark:text-slate-300 max-h-80">
                    {selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : "// Tidak ada perubahan data awal"}
                  </pre>
                </div>
                <div>
                  <h4 className="font-bold text-[10px] uppercase text-slate-700 dark:text-slate-400 mb-1.5">Data Setelah Perubahan (After)</h4>
                  <pre className="p-3 bg-slate-50 dark:bg-white/2 border border-slate-200/65 dark:border-white/6 rounded-lg text-[10px] font-mono overflow-x-auto text-slate-800 dark:text-slate-300 max-h-80">
                    {selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : "// Tidak ada perubahan data akhir"}
                  </pre>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-white/4 pt-3 space-y-1 text-[10px] text-slate-550 dark:text-slate-400">
                <div>IP Address: <span className="font-mono">{selectedLog.ip}</span></div>
                <div className="truncate">User Agent: <span className="font-mono">{selectedLog.userAgent}</span></div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/4 pt-4 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/4 cursor-pointer transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
